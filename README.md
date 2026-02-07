# SecureShards

SecureShards is a secure, client-side web application that allows users to split sensitive information into multiple encrypted pieces (shards) using Shamir's Secret Sharing algorithm. This provides an additional layer of security beyond traditional password managers or cloud storage solutions.

## 🔐 Key Features

- **Split & Recover**: Split secrets into multiple encrypted shards and recover them when needed
- **Threshold-Based Security**: Specify how many shards are required to reconstruct the secret
- **Client-Side Processing**: All encryption and processing happens in your browser
- **Multiple Export Formats**: Export shards as text files, QR code images, or PDF recovery sheets
- **Beginner Guidance**: Preset recommendations and live threshold explainer
- **Password Protection**: Additional encryption layer using user-provided passwords
- **Recovery Diagnostics**: See how many shards were parsed, deduplicated, and decoded

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 💡 Use Cases

- Secure storage of cryptocurrency recovery phrases
- Distributing access to sensitive passwords among team members
- Backing up encryption keys across multiple locations
- Creating redundant copies of critical information
- Implementing secure inheritance plans for digital assets

## 🔒 Security Features

- End-to-end encryption
- Client-side processing (secrets never leave your browser)
- Threshold-based reconstruction (N of M shards required)
- Password-protected shards
- No server-side storage

## 🛠️ Technical Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing) - Cryptographic algorithm

## 📖 How It Works

1. **Generate Mode**:
   - Enter your secret and a strong password
   - Choose a beginner-friendly preset or customize shard thresholds
   - Export shards as text files, QR codes, or PDF recovery sheets with embedded QR codes and instructions
   - Confirm the safety checklist before export
   - Distribute shards to trusted parties or secure locations

2. **Recover Mode**:
   - Upload shard files (TXT/PNG/PDF)
   - Enter the original password
   - Recover your secret and review diagnostics

## 🔗 Links

- [Website](https://secureshards.sv3n.me)

---

Made with ❤️ by [sv3n.me](https://sv3n.me)
