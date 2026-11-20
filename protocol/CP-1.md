# CP/1 — Copypaste Protocol v0.1

Status: experimental reference specification.

## 1. Identity

An identity is an Ed25519 public key encoded as 32 bytes / 64 lowercase hex characters. Canonical identifier: `cp:<pubkey_hex>`. The private key is controlled by its owner and MUST NOT be sent to relays.

## 2. Signed event

JSON envelope:

```json
{
  "v": 1,
  "id": "<64 lowercase hex>",
  "pubkey": "<64 lowercase hex>",
  "created_at": 1795161600,
  "kind": 1,
  "tags": [],
  "content": "hello",
  "sig": "<128 lowercase hex>"
}
```

The canonical event preimage is the UTF-8 encoding of compact JSON serialization of the array:

`[1, pubkey, created_at, kind, tags, content]`

The `id` is lowercase hex SHA-256 of that preimage. The `sig` is an Ed25519 signature over the 32 raw bytes represented by `id`.

All implementations MUST preserve array order and use UTF-8 JSON with no insignificant whitespace. Content is a Unicode string. Timestamps are Unix seconds.

## 3. Event kinds

- `0`: profile metadata. Content is JSON object with optional `name`, `bio`, `hex`, `avatar_seed`, `avatar_svg`.
- `1`: public text post.
- `2`: follow. Include tag `["p", "<pubkey_hex>"]`.
- `3`: reaction. Include tag `["e", "<event_id>"]`; content is reaction string.

Unknown kinds should be rejected by CP/1 v0.1 relays.

## 4. Relay HTTP API

- `GET /api/v1/relay/info`
- `POST /api/v1/events`
- `GET /api/v1/feed?limit=50`
- `GET /api/v1/profiles`
- `GET /api/v1/profiles/{pubkey_hex}`
- `GET /.well-known/copypaste.json`

A relay MUST verify version, field formats, event ID, signature, timestamp bounds and size limits before accepting an event. Duplicate IDs are idempotent. Relays MUST NOT mutate signed event content.

## 5. Decentralization roadmap

The reference node currently stores events in a single Cloudflare D1 database. CP/1 aims to support multiple independently operated relays. Future revisions will specify relay discovery, client-selected relay lists, synchronization cursors, deletion/tombstone semantics, spam controls and encrypted messaging. Until those features ship, this implementation is a single-node reference relay, not a fully replicated P2P network.

## 6. Interoperability

CP/1 is its own protocol. It does not claim wire compatibility with Nostr or any other existing protocol.
