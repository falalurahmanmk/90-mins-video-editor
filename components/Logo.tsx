
import React from 'react';

interface LogoProps {
    simple?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ simple = false }) => {
    return (
        <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" className="font-anton w-full h-full">
            <defs>
                <filter id="dropshadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1"/> 
                    <feOffset dx="1" dy="1" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge> 
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                </filter>
            </defs>

            {/* 90 */}
            <g transform="translate(10, 10)" filter={simple ? 'none' : 'url(#dropshadow)'}>
                <path d="M52,0 L18,0 L0,18 L0,92 L18,110 L52,110 L70,92 L70,18 L52,0 Z M55,18 L55,92 L52,95 L18,95 L15,92 L15,18 L18,15 L52,15 L55,18 Z M45,40 L45,25 L25,25 L25,70 L45,70 L45,55 L35,55 L35,40 L45,40 Z" fill="#facc15" stroke="#1f2937" strokeWidth="8" />
                <path d="M140,0 L106,0 L88,18 L88,92 L106,110 L140,110 L158,92 L158,18 L140,0 Z M143,18 L143,92 L140,95 L106,95 L103,92 L103,18 L106,15 L140,15 L143,18 Z M128,80 L118,80 L118,30 L128,30 L128,80 Z" fill="#facc15" stroke="#1f2937" strokeWidth="8"/>
            </g>

            {/* Text Box */}
            <g transform="translate(165, 10)">
                <rect x="0" y="0" width="225" height="110" rx="15" ry="15" fill="#1f2937" />
                <rect x="5" y="5" width="215" height="50" rx="10" ry="10" fill="#facc15" />
                <rect x="5" y="55" width="215" height="50" rx="10" ry="10" fill="black" />
                
                <text x="112.5" y="45" textAnchor="middle" fontSize="40" fill="black" letterSpacing="-1">MINUTES</text>
                <text x="112.5" y="95" textAnchor="middle" fontSize="40" fill="#facc15" letterSpacing="-1">NEWS</text>
            </g>

            {!simple && (
                <text x="277.5" y="135" textAnchor="middle" fontSize="14" fill="black" fontWeight="bold">EVERY GOAL EVERY TRANSFER INSTANTLY!</text>
            )}
        </svg>
    )
};
