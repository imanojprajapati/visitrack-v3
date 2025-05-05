# Visitrack - Seamless Expo Registration

Visitrack is a modern web application for seamless expo registration with mobile verification and QR code badges.

## Features

- Mobile number verification with OTP
- Event registration form
- QR code badge generation
- Badge download and printing
- Responsive design
- Modern UI with Tailwind CSS

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- QRCode.react

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/visitrack-frontend.git
cd visitrack-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
visitrack-frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/         # Next.js pages
│   └── styles/        # Global styles
├── public/            # Static assets
├── package.json       # Dependencies
├── tailwind.config.js # Tailwind configuration
├── tsconfig.json      # TypeScript configuration
└── next.config.js     # Next.js configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 