'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';

// Dynamically import the graph component
const GraphVisualization = dynamic(() => import('../graph-component'), {
  ssr: false,
  loading: () => <div className="w-full h-96 flex items-center justify-center text-foreground">Loading graph...</div>,
});

const MIN_DEG = -135;
const MAX_DEG = 135;
const TOTAL_TICKS = 40;
const DEGREES_PER_TICK = (MAX_DEG - MIN_DEG) / TOTAL_TICKS;

function getRiskColor(score: number) {
  if (score < 100) return '#22c55e'; // Green
  if (score < 200) return '#eab308'; // Yellow
  if (score < 500) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

function getRiskLabel(score: number) {
  if (score < 100) return 'Safe';
  if (score < 200) return 'Low Risk';
  if (score < 500) return 'Medium Risk';
  return 'High Risk';
}

function RiskKnob({ score }: { score: number }) {
  const [isDragging, setIsDragging] = useState(false);
  const rawRotation = useMotionValue(MIN_DEG);
  const snappedRotation = useMotionValue(MIN_DEG);
  const smoothRotation = useSpring(snappedRotation, {
    stiffness: 400,
    damping: 35,
    mass: 0.8,
  });

  const knobRef = useRef<HTMLDivElement>(null);
  const riskColor = getRiskColor(score);
  const maxScore = 500;
  const scorePercentage = Math.min((score / maxScore) * 100, 100);
  const targetDegrees = MIN_DEG + (scorePercentage / 100) * (MAX_DEG - MIN_DEG);

  const displayValue = useTransform(smoothRotation, [MIN_DEG, MAX_DEG], [0, maxScore]);
  const lightOpacity = useTransform(rawRotation, [MIN_DEG, MAX_DEG], [0.05, 0.5]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    snappedRotation.set(targetDegrees);
    rawRotation.set(targetDegrees);
  }, [score, snappedRotation, rawRotation, targetDegrees]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!knobRef.current) return;

      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const x = e.clientX - centerX;
      const y = e.clientY - centerY;

      let rads = Math.atan2(y, x);
      let degs = rads * (180 / Math.PI) + 90;

      if (degs > 180) degs -= 360;
      if (degs < MIN_DEG && degs > -180) degs = MIN_DEG;
      if (degs > MAX_DEG) degs = MAX_DEG;

      rawRotation.set(degs);
      const snap = Math.round(degs / DEGREES_PER_TICK) * DEGREES_PER_TICK;
      snappedRotation.set(snap);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      // Snap back to score position
      snappedRotation.set(targetDegrees);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, rawRotation, snappedRotation, targetDegrees]);

  const ticks = Array.from({ length: TOTAL_TICKS + 1 });

  return (
    <div className="relative w-80 h-80 select-none">
      {/* Background Glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-75"
        style={{
          opacity: lightOpacity,
          backgroundColor: riskColor,
        }}
      />

      {/* Tick Marks */}
      <div className="absolute inset-0 pointer-events-none">
        {ticks.map((_, i) => {
          const angle = (i / TOTAL_TICKS) * (MAX_DEG - MIN_DEG) + MIN_DEG;
          return (
            <div
              key={i}
              className="absolute top-0 left-1/2 w-1 h-full -translate-x-1/2"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <motion.div
                style={{
                  backgroundColor: useTransform(smoothRotation, (r: number) =>
                    r >= angle ? riskColor : '#404040'
                  ),
                  opacity: useTransform(smoothRotation, (r: number) =>
                    r >= angle ? 1 : 0.2
                  ),
                }}
                className="w-1 h-2.5 rounded-full"
              />
            </div>
          );
        })}
      </div>

      {/* Knob Body */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56">
        <motion.div
          ref={knobRef}
          className="relative w-full h-full rounded-full touch-none cursor-grab active:cursor-grabbing"
          style={{ rotate: smoothRotation }}
          onPointerDown={handlePointerDown}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Outer Ring */}
          <div className="w-full h-full rounded-full bg-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-neutral-800 flex items-center justify-center relative overflow-hidden">
            {/* Texture */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_50%)]" />

            {/* Inner Cap */}
            <div className="relative w-32 h-32 rounded-full bg-neutral-950 shadow-[inset_0_2px_5px_rgba(0,0,0,1)] border border-neutral-800/50 flex flex-col items-center justify-center">
              {/* Indicator Line */}
              <motion.div
                className="absolute top-3 w-1.5 h-6 rounded-full"
                style={{
                  backgroundColor: riskColor,
                  boxShadow: useTransform(
                    rawRotation,
                    (r) => `0 0 ${Math.max(5, (r + 135) / 10)}px ${riskColor}`
                  ),
                }}
              />

              <div className="flex flex-col items-center mt-6">
                <span className="font-mono text-xs text-neutral-500 tracking-widest">RISK</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Digital Score Display */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <span className="text-xs text-neutral-600 font-mono tracking-[0.2em] mb-3">SCORE</span>
        <div className="relative flex flex-col items-center">
          <span
            className="absolute inset-0 blur-sm font-mono text-4xl font-black tabular-nums tracking-widest"
            style={{ color: `${riskColor}40` }}
          >
            {score.toString().padStart(4, '0')}
          </span>
          <span className="relative font-mono text-4xl font-black tabular-nums tracking-widest" style={{ color: riskColor }}>
            {score.toString().padStart(4, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

interface RiskData {
  risk_score: number;
  reasons: string[];
  address: string;
  nodes?: any[];
  edges?: any[];
  root_wallet?: string;
}

export default function RiskAssessment() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      setError('Please enter a valid address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://127.0.0.1:5000/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[v0] Risk data:', data);

      setRiskData({
        risk_score: data.risk_score || 0,
        reasons: data.reasons || [],
        address: address,
        nodes: data.nodes,
        edges: data.edges,
        root_wallet: data.root_wallet,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risk data');
    } finally {
      setLoading(false);
    }
  };

  if (!riskData) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        {/* Animated background gradient */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card opacity-50" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="w-full min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* Back to Home button */}
            <button
              onClick={() => router.push('/')}
              className="mb-8 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Back to Home
            </button>

            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Wallet Risk Scanner
                </h1>
                <p className="text-muted-foreground text-lg">
                  Analyze the security risk of any Ethereum wallet
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-accent/50 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <div className="relative bg-card border border-border rounded-2xl p-1">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter wallet address (0x...)"
                      className="w-full px-6 py-4 bg-background border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-primary to-accent text-foreground font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? 'Analyzing...' : 'Analyze Wallet'}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border p-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Risk Analysis</h1>
            <p className="text-sm text-muted-foreground font-mono">{riskData.address}</p>
          </div>
          <button
            onClick={() => {
              setRiskData(null);
              setAddress('');
              setError(null);
            }}
            className="px-4 py-2 bg-card border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
          >
            New Analysis
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Risk Knob Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center mb-20"
        >
          <div className="relative">
            <RiskKnob score={riskData.risk_score} />
          </div>

          {/* Risk Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-32 text-center"
          >
            <div
              className="inline-block px-6 py-2 rounded-lg font-semibold mb-2"
              style={{
                color: getRiskColor(riskData.risk_score),
                backgroundColor: `${getRiskColor(riskData.risk_score)}20`,
                border: `1px solid ${getRiskColor(riskData.risk_score)}40`,
              }}
            >
              {getRiskLabel(riskData.risk_score)}
            </div>
          </motion.div>

          {/* Risk Reasons */}
          {riskData.reasons && riskData.reasons.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 w-full max-w-2xl"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">Risk Factors</h3>
              <div className="space-y-2">
                {riskData.reasons.map((reason, idx) => (
                  <div key={idx} className="p-3 bg-card border border-border rounded-lg text-sm text-foreground">
                    {reason}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Graph Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">Network Graph</h2>
          <div className="border border-border rounded-lg overflow-hidden bg-card/30">
            <GraphVisualization graphData={riskData} address={riskData.address} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
