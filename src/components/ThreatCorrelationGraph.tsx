import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Shield, Globe, Server, AlertTriangle, FileX, User } from 'lucide-react';

// Custom node component for threat entities
const ThreatNode = ({ data }: { data: any }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'ip': return <Server className="h-4 w-4" />;
      case 'domain': return <Globe className="h-4 w-4" />;
      case 'malware': return <FileX className="h-4 w-4" />;
      case 'threat_actor': return <User className="h-4 w-4" />;
      case 'vulnerability': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type: string, severity?: string) => {
    if (severity === 'critical') return 'bg-red-500/20 border-red-500';
    if (severity === 'high') return 'bg-orange-500/20 border-orange-500';
    if (severity === 'medium') return 'bg-yellow-500/20 border-yellow-500';
    
    switch (type) {
      case 'ip': return 'bg-blue-500/20 border-blue-500';
      case 'domain': return 'bg-green-500/20 border-green-500';
      case 'malware': return 'bg-red-500/20 border-red-500';
      case 'threat_actor': return 'bg-purple-500/20 border-purple-500';
      case 'vulnerability': return 'bg-orange-500/20 border-orange-500';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${getNodeColor(data.type, data.severity)} backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
        {getIcon(data.type)}
        <div>
          <div className="text-xs font-medium text-foreground">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.type}</div>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  threat: ThreatNode,
};

// Sample threat correlation data
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'threat',
    position: { x: 250, y: 50 },
    data: { label: 'APT-2024-001', type: 'threat_actor', severity: 'critical' },
  },
  {
    id: '2',
    type: 'threat',
    position: { x: 100, y: 150 },
    data: { label: '192.168.1.100', type: 'ip', severity: 'high' },
  },
  {
    id: '3',
    type: 'threat',
    position: { x: 400, y: 150 },
    data: { label: 'malicious.example.com', type: 'domain', severity: 'high' },
  },
  {
    id: '4',
    type: 'threat',
    position: { x: 250, y: 250 },
    data: { label: 'trojan.exe', type: 'malware', severity: 'critical' },
  },
  {
    id: '5',
    type: 'threat',
    position: { x: 50, y: 300 },
    data: { label: 'CVE-2024-0001', type: 'vulnerability', severity: 'medium' },
  },
  {
    id: '6',
    type: 'threat',
    position: { x: 450, y: 300 },
    data: { label: '10.0.0.50', type: 'ip', severity: 'medium' },
  },
  {
    id: '7',
    type: 'threat',
    position: { x: 150, y: 400 },
    data: { label: 'phishing.site.com', type: 'domain', severity: 'high' },
  },
  {
    id: '8',
    type: 'threat',
    position: { x: 350, y: 400 },
    data: { label: 'backdoor.dll', type: 'malware', severity: 'high' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ef4444', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    label: 'controls',
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ef4444', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    label: 'uses',
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    type: 'smoothstep',
    style: { stroke: '#f97316', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
    label: 'downloads',
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    style: { stroke: '#f97316', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
    label: 'hosts',
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    type: 'smoothstep',
    style: { stroke: '#eab308', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#eab308' },
    label: 'exploits',
  },
  {
    id: 'e2-6',
    source: '2',
    target: '6',
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'communicates',
  },
  {
    id: 'e6-7',
    source: '6',
    target: '7',
    type: 'smoothstep',
    style: { stroke: '#f97316', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
    label: 'redirects',
  },
  {
    id: 'e7-8',
    source: '7',
    target: '8',
    type: 'smoothstep',
    style: { stroke: '#f97316', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
    label: 'delivers',
  },
  {
    id: 'e4-8',
    source: '4',
    target: '8',
    type: 'smoothstep',
    style: { stroke: '#eab308', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#eab308' },
    label: 'related',
  },
];

export function ThreatCorrelationGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const minimapNodeColor = (node: Node) => {
    switch (node.data.severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#6b7280';
    }
  };

  return (
    <div className="h-64 w-full bg-background border border-border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ backgroundColor: 'hsl(var(--background))' }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="bg-card border-border" />
        <MiniMap 
          nodeColor={minimapNodeColor}
          className="bg-card border-border"
          maskColor="hsl(var(--background) / 0.8)"
        />
        <Background 
          gap={20} 
          size={1} 
          color="hsl(var(--muted-foreground) / 0.3)"
        />
      </ReactFlow>
    </div>
  );
}