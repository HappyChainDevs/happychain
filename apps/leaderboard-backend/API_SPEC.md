# Leaderboard Backend API Specification

## Overview

This document details the REST API for the Leaderboard backend. It describes endpoints, request/response schemas, and validation rules for managing users, guilds, games, and leaderboards.

---

## Entities

### User

- `id`: integer
- `happy_wallet`: string (hex address)
- `username`: string
- `guild_id`: integer | null
- `created_at`: ISO8601 string

### Guild

- `id`: integer
- `name`: string
- `admin_id`: integer (user id)
- `created_at`: ISO8601 string

### Game

- `id`: integer
- `name`: string
- `icon_url`: string | null
- `admin_id`: integer (user id)
- `created_at`: ISO8601 string
- `last_updated_at`: ISO8601 string

### UserGameScore

- `id`: integer
- `user_id`: integer
- `game_id`: integer
- `score`: integer
- `last_updated_at`: ISO8601 string

---

## Endpoints

### Users

#### `GET /users`

Query users by `happy_wallet`, `username`, or `guild_id` (all optional).

- **Query Params:**
  - `happy_wallet`: string (hex)
  - `username`: string
  - `guild_id`: integer
- **Response:** `200 OK`
  - Array of User objects

#### `POST /users`

Create a new user.

- **Body:**

  ```json
  {
    "happy_wallet": "0x...", // required, hex string
    "username": "string",    // required
    "guild_id": 1             // optional
  }
  ```

- **Response:** `201 Created`
  - User object

### Guilds

#### `GET /guilds`

List all guilds.

- **Response:** `200 OK`
  - Array of Guild objects

#### `POST /guilds`

Create a new guild.

- **Body:**

  ```json
  {
    "name": "Guild Name",    // required
    "admin_id": 1            // required
  }
  ```

- **Response:** `201 Created`
  - Guild object

### Games

#### `GET /games`

List all games.

- **Response:** `200 OK`
  - Array of Game objects

#### `POST /games`

Create a new game.

- **Body:**

  ```json
  {
    "name": "Game Name",         // required
    "icon_url": "https://...",  // optional
    "admin_id": 1,               // required
    "created_at": "2025-04-25T15:47:36+05:30", // required
    "last_updated_at": "2025-04-25T15:47:36+05:30" // required
  }
  ```

- **Response:** `201 Created`
  - Game object

#### `POST /games/:gameId/scores`

Admin updates (or creates) a user's score for a game.

- **Body:**

  ```json
  {
    "user_id": 2,          // required
    "score": 123,          // required
    "acting_user_id": 1    // required (must be admin of the game)
  }
  ```

- **Response:** `200 OK`
  - UserGameScore object
- **Errors:**
  - 400: Missing required fields
  - 403: Only game admin can update scores

#### `GET /games/:gameId/leaderboard`

Get sorted leaderboard (users) for a game.

- **Response:** `200 OK`
  - Array of objects: `{ username, guild_id, score }`

#### `GET /games/:gameId/guild-leaderboard`

Get sorted guild leaderboard (aggregate scores) for a game.

- **Response:** `200 OK`
  - Array of objects: `{ guild_name, total_score, games }`

### Leaderboard

#### `GET /leaderboard`

Get global leaderboard (all games, all users).

- **Response:** `200 OK`
  - Array of objects (format TBD by implementation)

---

## Validation Rules

- **User**
  - `happy_wallet`: must be a valid hex string
  - `username`: required, string
  - `guild_id`: integer or null
- **Guild**
  - `name`: required, string
  - `admin_id`: required, integer
- **Game**
  - `name`: required, string
  - `icon_url`: string or null
  - `admin_id`: required, integer
  - `created_at`, `last_updated_at`: required, ISO8601 string
- **UserGameScore**
  - `user_id`, `game_id`, `score`: required, integer

---

## Error Handling

- All endpoints return `{ error: string }` with appropriate HTTP status on failure.
- Validation errors return `400 Bad Request`.
- Authorization errors return `403 Forbidden`.
- Internal errors return `500 Internal Server Error`.

---

## TODO / Open Questions

- Finalize guilds API implementation and validation.
- Specify global leaderboard response schema.
- Confirm if additional update/delete endpoints are needed for users, games, guilds.
