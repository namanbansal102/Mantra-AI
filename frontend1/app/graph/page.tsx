'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
// @ts-ignore - no types for three-spritetext in this project
import SpriteText from 'three-spritetext';

// Dynamically import ForceGraph to avoid SSR issues
const ForceGraph:any = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      <div className="text-foreground text-lg">Loading Graph...</div>
    </div>
  ),
});

interface Node {
  id: string;
  label: string;
  type: string;
  distance: number;
  risk_score: number;
  suspicious_score: number;
  is_scam: boolean;
  balance: number;
  tx_count: number;
  layer: number;
  tooltip: string;
}

interface Link {
  source: string;
  target: string;
}

interface GraphData {
  root_wallet: string;
  nodes: Node[];
}

// Color scale based on suspicious score (0 = green, 100 = red)
const getNodeColor = (suspiciousScore: number): string => {
  if (suspiciousScore >= 80) return '#dc2626'; // Deep red
  if (suspiciousScore >= 60) return '#ef4444'; // Red
  if (suspiciousScore >= 40) return '#f97316'; // Orange
  if (suspiciousScore >= 20) return '#eab308'; // Yellow
  return '#22c55e'; // Green
};

const getRiskGlow = (suspiciousScore: number): string => {
  if (suspiciousScore >= 80) return 'rgb(220, 38, 38, 0.6)';
  if (suspiciousScore >= 60) return 'rgb(239, 68, 68, 0.5)';
  if (suspiciousScore >= 40) return 'rgb(249, 115, 22, 0.4)';
  if (suspiciousScore >= 20) return 'rgb(234, 179, 8, 0.3)';
  return 'rgb(34, 197, 94, 0.2)';
};

export default function GraphVisualization() {
  const [graphData, setGraphData] = useState<{
    nodes: Array<Node & { x?: number; y?: number; z?: number }>;
    links: Link[];
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://127.0.0.1:5000/validate', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const rawData: GraphData = await response.json();
        console.log("[v0] Fetched wallet data:", rawData);

        // Create formatted labels (shortened addresses)
        const formattedNodes = rawData.nodes.map((node) => ({
          ...node,
          // show last 4 characters of the address on the node
          label: node.id.slice(-4),
          tooltip: generateTooltip(node),
        }));

        // Create links based on layer connections and distance
        const links: Link[] = [];
        formattedNodes.forEach((node) => {
          // Connect to root wallet
          if (node.distance > 0) {
            links.push({
              source: rawData.root_wallet,
              target: node.id,
            });
          }
          // Connect to nodes in previous layer
          const parentNode = formattedNodes.find((n) => n.layer === node.layer - 1);
          if (parentNode && parentNode.id !== rawData.root_wallet) {
            links.push({
              source: parentNode.id,
              target: node.id,
            });
          }
        });

        setGraphData({
          nodes: formattedNodes,
          links,
        });
        setLoading(false);
      } catch (err) {
        console.error("[v0] Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch wallet data from API'
        );
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const generateTooltip = (node: Node): string => {
    const statusEmoji = node.suspicious_score >= 80 
      ? '🚨 Critical Fraud'
      : node.suspicious_score >= 60
      ? '🔴 High Risk'
      : node.suspicious_score >= 40
      ? '⚠️ Medium Risk'
      : node.suspicious_score >= 20
      ? '⚡ Low Risk'
      : '✅ Safe';

    return `════════════════════════════════════════
  WALLET  |  Layer ${node.layer}
────────────────────────────────────────
  Address   ${node.id}
  Balance   ${node.balance.toFixed(6)} ETH
  Tx Count  ${node.tx_count}
────────────────────────────────────────
  Risk Score       ${node.risk_score}
  Suspicion Score  ${node.suspicious_score}/100
  Status           ${statusEmoji}
  Is Scam          ${node.is_scam ? '⛔ Yes' : '✓ No'}
════════════════════════════════════════`;
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground text-lg mb-4">Loading Graph...</div>
          <div className="text-muted-foreground text-sm">Fetching wallet data from API</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-destructive text-lg mb-4">Error Loading Data</div>
          <div className="text-muted-foreground text-sm mb-4">{error}</div>
          <div className="text-muted-foreground text-xs">
            Make sure your Python API is running at{' '}
            <code className="bg-card px-2 py-1 rounded">http://127.0.0.1:5000/validate</code>
          </div>
        </div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <ForceGraph
        graphData={graphData}
        nodeColor={(node: any) => getNodeColor((node as Node).suspicious_score)}
        nodeVal={(node: any) => {
          const suspiciousScore = (node as Node).suspicious_score;
          return 8 + suspiciousScore / 15;
        }}
        /* 3D node labels using three-spritetext — visible inside the node ball */
        nodeThreeObject={(node: any) => {
          const label = (node as any).label || '';
          const sprite = new SpriteText(label);
          sprite.color = '#ffffff';
          // scale text with suspicious score so important nodes stand out
          sprite.textHeight = 0.4 + ((node as any).suspicious_score || 0) / 15;
          sprite.material.depthWrite = false; // keeps label visible
          return sprite;
        }}
        nodeThreeObjectExtend={true}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const size = 8 + (node as Node).suspicious_score / 15;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size * 2, 0, 2 * Math.PI);
          ctx.fill();
        }}
        linkColor={(link: any) => {
          const sourceNode = graphData.nodes.find((n) => n.id === link.source.id || n.id === link.source);
          if (sourceNode && sourceNode.suspicious_score > 80) {
            return 'rgba(220, 38, 38, 0.5)';
          }
          if (sourceNode && sourceNode.suspicious_score > 60) {
            return 'rgba(239, 68, 68, 0.4)';
          }
          if (sourceNode && sourceNode.suspicious_score > 40) {
            return 'rgba(249, 115, 22, 0.3)';
          }
          return 'rgba(100, 116, 139, 0.2)';
        }}
        linkWidth={(link: any) => {
          const sourceNode = graphData.nodes.find((n) => n.id === link.source.id || n.id === link.source);
          return sourceNode && sourceNode.suspicious_score > 60 ? 2 : 1;
        }}
        linkCurvature={0.1}
        onNodeHover={(node: any) => {
          setHoveredNode(node ? (node as Node).id : null);
        }}
        onNodeClick={(node: any) => {
          // Can add click handling here
        }}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        backgroundColor="#0a0a0a"
        showNavInfo={true}
      />

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 max-w-md bg-card border border-border rounded-lg p-4 text-foreground text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto backdrop-blur-sm">
          {graphData.nodes.find((n) => n.id === hoveredNode)?.tooltip}
        </div>
      )}

      {/* Title and Info */}
      <div className="absolute top-4 left-4 text-foreground">
        <h1 className="text-3xl font-bold mb-2">Wallet Risk Network</h1>
        <p className="text-sm text-muted-foreground">
          Blockchain transaction graph with risk-based visualization
        </p>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-card border border-border rounded-lg p-4 text-xs space-y-2 text-foreground">
        <div className="font-bold mb-3">Risk Levels</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Safe (0-20)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span>Low Risk (20-40)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
          <span>Medium Risk (40-60)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>High Risk (60-80)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-700"></div>
          <span>Critical (80-100)</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg p-4 text-xs text-muted-foreground space-y-1">
        <p>🖱️ Drag to rotate</p>
        <p>🔍 Scroll to zoom</p>
        <p>🎯 Hover for details</p>
      </div>
    </div>
  );
}
