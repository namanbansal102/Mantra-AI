'use client';

import { useEffect, useState } from 'react';

interface RiskMeterProps {
  score: number;
  maxScore?: number;
}

export function RiskMeter({ score, maxScore = 500 }: RiskMeterProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Animate score from 0 to actual score
    let animationFrame: number;
    let currentScore = 0;
    const targetScore = score;
    const duration = 1500; // milliseconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      currentScore = targetScore * easeOutCubic;
      
      setDisplayScore(currentScore);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [score]);

  const getRiskLevel = (value: number) => {
    if (value < 100) return { level: 'Safe', color: '#22c55e', textColor: 'text-green-400' };
    if (value < 200) return { level: 'Low Risk', color: '#eab308', textColor: 'text-yellow-400' };
    if (value < 500) return { level: 'Medium Risk', color: '#f97316', textColor: 'text-orange-400' };
    return { level: 'High Risk', color: '#ef4444', textColor: 'text-red-400' };
  };

  const getGaugePercentage = (value: number) => {
    return Math.min((value / maxScore) * 100, 100);
  };

  const gaugeDegrees = (getGaugePercentage(displayScore) / 100) * 180;
  const riskInfo = getRiskLevel(displayScore);

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-64 h-40">
        <svg className="w-full h-full" viewBox="0 0 300 180" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={riskInfo.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={riskInfo.color} stopOpacity="1" />
            </linearGradient>
            <filter id="shadowFilter">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d="M 40 160 A 120 120 0 0 1 260 160"
            fill="none"
            stroke="rgba(100, 116, 139, 0.15)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Green segment (0-100) */}
          <path
            d="M 40 160 A 120 120 0 0 1 88 42"
            fill="none"
            stroke="#22c55e"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Yellow segment (100-200) */}
          <path
            d="M 88 42 A 120 120 0 0 1 150 16"
            fill="none"
            stroke="#eab308"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Orange segment (200-500) */}
          <path
            d="M 150 16 A 120 120 0 0 1 212 42"
            fill="none"
            stroke="#f97316"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Red segment (500+) */}
          <path
            d="M 212 42 A 120 120 0 0 1 260 160"
            fill="none"
            stroke="#ef4444"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const angle = (percent / 100) * 180;
            const radian = (angle - 90) * (Math.PI / 180);
            const x1 = 150 + 125 * Math.cos(radian);
            const y1 = 160 + 125 * Math.sin(radian);
            const x2 = 150 + 135 * Math.cos(radian);
            const y2 = 160 + 135 * Math.sin(radian);
            return (
              <line
                key={`tick-${percent}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(148, 163, 184, 0.4)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}

          {/* Needle */}
          <g transform={`rotate(${gaugeDegrees} 150 160)`}>
            <line
              x1="150"
              y1="160"
              x2="150"
              y2="50"
              stroke="url(#needleGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#shadowFilter)"
            />
            <polygon
              points="150,160 145,172 155,172"
              fill={riskInfo.color}
              filter="url(#shadowFilter)"
            />
          </g>

          {/* Center circle */}
          <circle cx="150" cy="160" r="12" fill={riskInfo.color} opacity="0.2" />
          <circle cx="150" cy="160" r="8" fill={riskInfo.color} filter="url(#shadowFilter)" />
        </svg>

        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <div className="text-5xl font-bold tabular-nums">{Math.round(displayScore)}</div>
          <div className={`text-sm font-semibold mt-1 ${riskInfo.textColor}`}>{riskInfo.level}</div>
        </div>
      </div>
    </div>
  );
}
