import React from 'react';
import { cn } from '../lib/utils';
import { SentimentAnalysis } from '../types';
import { getSentimentColor, getSentimentBgColor } from '../lib/utils';

interface SentimentGaugeProps {
  sentiment: SentimentAnalysis;
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({ sentiment }) => {
  const { score, label, confidence } = sentiment;
  
  // Calculate the circumference of the circle
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Sentiment Analysis</h3>
        <div className="text-right">
          <div className={cn(
            'text-2xl font-bold',
            getSentimentColor(score)
          )}>
            {score}%
          </div>
          <div className="text-sm text-muted-foreground">
            {label}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          <svg
            className="w-32 h-32 transform -rotate-90"
            viewBox="0 0 120 120"
          >
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={cn(
                'transition-all duration-1000 ease-out',
                getSentimentBgColor(score)
              )}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
              }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn(
                'text-3xl font-bold',
                getSentimentColor(score)
              )}>
                {score}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Confidence: {(confidence * 100).toFixed(0)}%
        </p>
      </div>

      {/* Sentiment Scale */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Very Negative</span>
          <span>Neutral</span>
          <span>Very Positive</span>
        </div>
        <div className="relative h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full">
          <div
            className="absolute top-0 w-3 h-3 bg-foreground rounded-full transform -translate-y-0.5 transition-all duration-1000 ease-out"
            style={{
              left: `${score}%`,
              transform: 'translateX(-50%) translateY(-0.125rem)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
};

export default SentimentGauge;