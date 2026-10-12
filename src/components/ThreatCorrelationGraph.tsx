import React, { useCallback, useEffect, useMemo } from 'react';
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

export interface GraphIndicator {
  id: string;
  indicator_value: string;
  indicator_type: string;
  confidence_score: number;
  metadata?: {
    include_in_graph?: boolean;
    graph_type?: string;
    links?: { to?: string; label?: string }[];
  } | null;
}

function severityFor(confidence: number) {
  if (confidence >= 90) return 'critical';
  if (confidence >= 70) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

function shortLabel(value: string) {
  if (value.length <= 28) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function buildCorrelation(indicators: GraphIndicator[]) {
  const graphed = indicators.filter((indicator) => indicator.metadata?.include_in_graph);
  const nodes: Node[] = graphed.map((indicator, index) => {
    const angle = (2 * Math.PI * index) / Math.max(graphed.length, 1);
    return {
      id: indicator.id,
      type: 'threat',
      position: {
        x: 280 + Math.cos(angle) * 220,
        y: 180 + Math.sin(angle) * 140,
      },
      data: {
        label: shortLabel(indicator.indicator_value),
        type: indicator.metadata?.graph_type || indicator.indicator_type,
        severity: severityFor(indicator.confidence_score),
      },
    };
  });
  const idByValue = new Map(graphed.map((indicator) => [indicator.indicator_value, indicator.id]));
  const edges: Edge[] = [];
  graphed.forEach((indicator) => {
    (indicator.metadata?.links || []).forEach((link, index) => {
      const target = link.to ? idByValue.get(link.to) : undefined;
      if (!target) return;
      edges.push({
        id: `${indicator.id}-${target}-${index}`,
        source: indicator.id,
        target,
        type: 'smoothstep',
        animated: indicator.confidence_score >= 90,
        style: { stroke: '#f97316', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
        label: link.label || 'related',
      });
    });
  });
  return { nodes, edges };
}

export function ThreatCorrelationGraph({ indicators }: { indicators: GraphIndicator[] }) {
  const built = useMemo(() => buildCorrelation(indicators), [indicators]);
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

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