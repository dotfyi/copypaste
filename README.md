# Copypaste Network

An independent identity and social network built around the **CP/1** protocol. This repository contains the reference Cloudflare Worker relay and the first web client.

## Core idea

- Identity is an Ed25519 public key: `cp:<64 lowercase hex chars>`.
- The private key is generated in the browser and is never uploaded.
- Actions are immutable signed events identified by SHA-256.
- Hex color is a visual alias only; collisions are allowed.
- Pixel avatar is generated locally in the browser; no DiceBear hosted API is called.
- Anyone can implement CP/1 and run a compatible relay.

## Stack

- Cloudflare Worker (HTTP API + static HTML client)
- Cloudflare D1 (append-only event store)
- Web Crypto Ed25519 + SHA-256
- GitHub source of truth

## Current reference implementation

- Register an identity, publish a signed profile event, download a recovery key file.
- Import a recovery key locally to sign in.
- Publish and read public text posts.
- Browse public profiles.
- Relay verifies event hash and Ed25519 signature before storage.
- API discovery at `/.well-known/copypaste.json` and `/api/v1/relay/info`.

## Honest decentralization status

The protocol is designed for independent relays, but this first deployment is **one reference relay backed by one D1 database**. It is not yet a replicated peer-to-peer network. Multi-relay publish/read, relay discovery, event synchronization, abuse controls and encrypted direct messages are future protocol milestones. No Nostr compatibility is claimed.

## Deploy

Worker name: `copypaste-network`

Binding required: D1 database named `copypaste-network`, binding `DB`.

Apply `migrations/0001_init.sql` to that D1 database, then deploy `worker/index.js` as an ES module Worker with the D1 binding.

## Security notes

- Recovery file contains the private key in plaintext JSON. Store it offline and do not share it. Anyone holding it controls the identity.
- There is no password reset or server-side key recovery.
- Current client is an MVP. Add encrypted key export, CSP/security headers, rate limiting, relay quotas, moderation controls and independent security review before production launch.
- Event signatures are checked server-side. Relays never receive private keys.
