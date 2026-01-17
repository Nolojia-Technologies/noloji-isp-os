'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

interface Customer {
    id: number;
    username: string;
    full_name?: string;
    latitude?: number;
    longitude?: number;
    is_online?: boolean;
    is_active?: boolean;
    address?: string;
    phone?: string;
    connection_type?: string;
    plan_name?: string;
}

interface FiberCable {
    id: number;
    name: string;
    description?: string;
    coordinates: [number, number][];
    cable_type: string;
    length_meters?: number;
    fiber_count?: number;
    status: string;
    color: string;
}

interface GISLabel {
    id: number;
    name: string;
    description?: string;
    label_type: string;
    latitude: number;
    longitude: number;
    icon: string;
    color: string;
}

interface NetworkMapProps {
    center?: [number, number];
    zoom?: number;
    customers?: Customer[];
    fiberCables?: FiberCable[];
    labels?: GISLabel[];
    drawingMode?: 'none' | 'line' | 'marker' | 'delete';
    drawingPoints?: [number, number][];
    onCustomerClick?: (customer: Customer) => void;
    onCableClick?: (cable: FiberCable) => void;
    onLabelClick?: (label: GISLabel) => void;
    onMapClick?: (lat: number, lng: number) => void;
    onLineClick?: (lat: number, lng: number) => void;
    showLayers?: {
        customers: boolean;
        cables: boolean;
        labels: boolean;
    };
}

function NetworkMapClient({
    center = [-1.2921, 36.8219],
    zoom = 13,
    customers = [],
    fiberCables = [],
    labels = [],
    drawingMode = 'none',
    drawingPoints = [],
    onCustomerClick,
    onCableClick,
    onLabelClick,
    onMapClick,
    onLineClick,
    showLayers = { customers: true, cables: true, labels: true }
}: NetworkMapProps) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const leafletRef = useRef<any>(null);
    const componentsRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);

    // Store drawingMode in ref to access in event handlers
    const drawingModeRef = useRef(drawingMode);
    useEffect(() => {
        drawingModeRef.current = drawingMode;
    }, [drawingMode]);

    useEffect(() => {
        let mounted = true;

        const loadLeaflet = async () => {
            try {
                // Import leaflet CSS
                await import('leaflet/dist/leaflet.css');

                // Import modules
                const [leafletModule, reactLeafletModule] = await Promise.all([
                    import('leaflet'),
                    import('react-leaflet')
                ]);

                if (!mounted) return;

                const L = leafletModule.default;

                // Fix default marker icons
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                });

                leafletRef.current = L;
                componentsRef.current = reactLeafletModule;
                setIsReady(true);
            } catch (err: any) {
                console.error('Failed to load map:', err);
                if (mounted) {
                    setError(err.message || 'Failed to load map');
                }
            }
        };

        loadLeaflet();

        return () => {
            mounted = false;
        };
    }, []);

    // Auto-fit bounds when data changes
    useEffect(() => {
        const L = leafletRef.current;
        const map = mapInstanceRef.current;

        if (!map || !L) return;

        const allCoords: [number, number][] = [];

        customers.forEach(c => {
            if (c.latitude && c.longitude) {
                allCoords.push([c.latitude, c.longitude]);
            }
        });

        labels.forEach(l => {
            if (l.latitude && l.longitude) {
                allCoords.push([l.latitude, l.longitude]);
            }
        });

        fiberCables.forEach(cable => {
            if (cable.coordinates) {
                cable.coordinates.forEach(coord => {
                    allCoords.push(coord);
                });
            }
        });

        if (allCoords.length > 0) {
            try {
                const bounds = L.latLngBounds(allCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
            } catch (e) {
                // Ignore bounds errors
            }
        }
    }, [customers, fiberCables, labels, isReady]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-950">
                <p className="text-red-600">Error: {error}</p>
            </div>
        );
    }

    if (!isReady || !componentsRef.current) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted" style={{ minHeight: '400px' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading map...</p>
                </div>
            </div>
        );
    }

    const L = leafletRef.current;
    const { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } = componentsRef.current;

    // Create custom icons
    const createCustomerIcon = (isOnline: boolean) => {
        return new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="
        width: 24px; 
        height: 24px; 
        background: ${isOnline ? '#22c55e' : '#ef4444'}; 
        border: 2px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    };

    const createLabelIcon = (type: string, color: string) => {
        const icons: Record<string, string> = {
            'olt': '📡',
            'splitter': '🔀',
            'fdt': '📦',
            'fat': '📍',
            'poi': '📌'
        };
        return new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="
        width: 28px; 
        height: 28px; 
        background: ${color || '#8b5cf6'}; 
        border: 2px solid white; 
        border-radius: 6px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
      ">${icons[type] || '📌'}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    };

    // Map click handler component
    const MapClickHandler = () => {
        const map = useMapEvents({
            click: (e: any) => {
                console.log('Map clicked, mode:', drawingModeRef.current);
                if (drawingModeRef.current === 'marker' && onMapClick) {
                    onMapClick(e.latlng.lat, e.latlng.lng);
                } else if (drawingModeRef.current === 'line' && onLineClick) {
                    onLineClick(e.latlng.lat, e.latlng.lng);
                }
            }
        });

        // Store map reference
        useEffect(() => {
            mapInstanceRef.current = map;
        }, [map]);

        return null;
    };

    // Cursor style based on drawing mode
    const cursorStyle = (drawingMode === 'marker' || drawingMode === 'line') ? 'crosshair' : 'grab';

    return (
        <div style={{ height: '100%', width: '100%', cursor: cursorStyle }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler />

                {/* Drawing Preview - Show polyline while drawing */}
                {drawingMode === 'line' && drawingPoints.length > 0 && (
                    <Polyline
                        positions={drawingPoints}
                        pathOptions={{
                            color: '#f97316',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '10, 10'
                        }}
                    />
                )}

                {/* Drawing Points Markers */}
                {drawingMode === 'line' && drawingPoints.map((point, index) => (
                    <Marker
                        key={`draw-point-${index}`}
                        position={point}
                        icon={new L.DivIcon({
                            className: 'custom-div-icon',
                            html: `<div style="
                                width: 12px; 
                                height: 12px; 
                                background: #f97316; 
                                border: 2px solid white; 
                                border-radius: 50%; 
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            "></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                        })}
                    />
                ))}

                {/* Fiber Cables */}
                {showLayers.cables && fiberCables.map((cable) => (
                    <Polyline
                        key={`cable-${cable.id}`}
                        positions={cable.coordinates}
                        pathOptions={{
                            color: cable.color || '#3b82f6',
                            weight: cable.cable_type === 'trunk' ? 5 : 3,
                            opacity: 0.8,
                            dashArray: cable.status === 'planned' ? '10, 10' : undefined
                        }}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent.stopPropagation();
                                onCableClick && onCableClick(cable);
                            }
                        }}
                    >
                        <Tooltip sticky>
                            <div>
                                <strong>{cable.name}</strong><br />
                                {cable.cable_type} • {cable.fiber_count || 12} cores
                            </div>
                        </Tooltip>
                    </Polyline>
                ))}

                {/* Labels/POIs */}
                {showLayers.labels && labels.map((label) => (
                    <Marker
                        key={`label-${label.id}`}
                        position={[label.latitude, label.longitude]}
                        icon={createLabelIcon(label.label_type, label.color)}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent?.stopPropagation();
                                onLabelClick && onLabelClick(label);
                            }
                        }}
                    >
                        <Tooltip>
                            <div>
                                <strong>{label.name}</strong><br />
                                <span style={{ textTransform: 'capitalize' }}>{label.label_type}</span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}

                {/* Customer markers */}
                {showLayers.customers && customers.filter(c => c.latitude && c.longitude).map((customer) => (
                    <Marker
                        key={`customer-${customer.id}`}
                        position={[customer.latitude!, customer.longitude!]}
                        icon={createCustomerIcon(customer.is_online || false)}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent?.stopPropagation();
                                onCustomerClick && onCustomerClick(customer);
                            }
                        }}
                    >
                        <Tooltip>
                            <div>
                                <strong>{customer.username}</strong><br />
                                {customer.full_name || 'No name'}<br />
                                <span style={{ color: customer.is_online ? '#22c55e' : '#ef4444' }}>
                                    {customer.is_online ? '● Online' : '○ Offline'}
                                </span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

// Export with SSR disabled
export const NetworkMap = dynamic(() => Promise.resolve(NetworkMapClient), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-muted" style={{ minHeight: '400px' }}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading map...</p>
            </div>
        </div>
    )
});

export default NetworkMap;
