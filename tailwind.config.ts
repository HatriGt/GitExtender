
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				git: {
					feature: '#2463EB',     // Blue for feature branches
					bugfix: '#F97316',      // Orange for bugfix branches
					hotfix: '#DC2626',      // Red for hotfix branches
					merged: '#10B981',      // Green for merged status 
					unmerged: '#6B7280',    // Gray for unmerged status
				},
				gitextender: {
					primary: '#2463EB',      // Primary blue
					secondary: '#1E40AF',    // Darker blue
					tertiary: '#3B82F6',     // Light blue
					dark: '#1F2937',         // Dark slate
					light: '#F9FAFB',        // Light gray
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-subtle': {
					'0%, 100%': {
						opacity: '1'
					},
					'50%': {
						opacity: '0.7'
					}
				},
				'slide-in': {
					'0%': {
						transform: 'translateY(10px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'slide-in-right': {
					'0%': {
						transform: 'translateX(20px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(-8deg)' },
					'75%': { transform: 'rotate(8deg)' }
				},
				'ripple': {
					'0%': { transform: 'scale(0)', opacity: '1' },
					'100%': { transform: 'scale(4)', opacity: '0' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				'ping-slow': {
					'75%, 100%': {
						transform: 'scale(1.1)',
						opacity: '0'
					}
				},
				'gradient-x': {
					'0%, 100%': {
						'background-position': '0% 50%'
					},
					'50%': {
						'background-position': '100% 50%'
					}
				},
				'gradient-y': {
					'0%, 100%': {
						'background-position': '50% 0%'
					},
					'50%': {
						'background-position': '50% 100%'
					}
				},
				'background-shine': {
					'0%': {
						'background-position': '0% 50%'
					},
					'100%': {
						'background-position': '100% 50%'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'slide-in': 'slide-in 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'wiggle': 'wiggle 0.5s ease-in-out',
				'ripple': 'ripple 0.6s linear',
				'float': 'float 3s ease-in-out infinite',
				'ping-slow': 'ping-slow 2s ease-out infinite',
				'gradient-x': 'gradient-x 10s ease infinite',
				'gradient-y': 'gradient-y 10s ease infinite',
				'background-shine': 'background-shine 8s linear infinite'
			},
			boxShadow: {
				'card-hover': '0 4px 25px 0 rgba(0, 0, 0, 0.1)',
				'soft': '0 4px 15px 0 rgba(0, 0, 0, 0.05)',
				'glow': '0 0 15px rgba(66, 153, 225, 0.5)',
				'inner-glow': 'inset 0 0 15px rgba(66, 153, 225, 0.2)'
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'dot-pattern': 'radial-gradient(circle, currentColor 1px, transparent 1px)',
				'mesh-pattern': 'linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
