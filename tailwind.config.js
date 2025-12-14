/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                serif: ['"Playfair Display"', 'serif'],
                display: ['"Cinzel"', 'serif'],
            },
            colors: {
                paper: '#F2F0E9',
                ink: '#1A1A1A',
                subtle: '#666666',
                accent: '#BC4749',
                surface: '#FFFFFF',
                'surface-hover': '#F8F8F8',
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'sharp': '4px 4px 0px 0px rgba(0,0,0,1)',
            },
            animation: {
                'in': 'fadeIn 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        }
    },
    plugins: [],
}
