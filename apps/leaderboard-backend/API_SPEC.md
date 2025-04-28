# API Routes structure

## User management

POST /api/users            // Create new user  
GET /api/users/:id         // Get user by ID  
PATCH /api/users/:id       // Update user details  
GET /api/users             // List users (with filtering)  

## User wallets

POST /api/users/:id/wallets        // Add wallet to user  
GET /api/users/:id/wallets         // Get user's wallets  
DELETE /api/users/:id/wallets/:addr // Remove wallet from user  
PATCH /api/users/:id/wallets/:addr // Set wallet as primary  

## Guild management

POST /api/guilds           // Create new guild (creator becomes admin)  
GET /api/guilds/:id        // Get guild by ID  
PATCH /api/guilds/:id      // Update guild details (admin only)  
GET /api/guilds            // List guilds (with filtering)  

## Guild membership

POST /api/guilds/:id/members       // Add member to guild (admin only)  
GET /api/guilds/:id/members        // List guild members  
DELETE /api/guilds/:id/members/:userId // Remove member from guild (admin only)  
PATCH /api/guilds/:id/members/:userId  // Update member role (admin only)  
GET /api/users/:id/guilds          // Get guilds a user belongs to  

## Games

POST /api/games            // Create new game  
GET /api/games/:id         // Get game by ID  
PATCH /api/games/:id       // Update game details (admin only)  
GET /api/games             // List games (with filtering)  

## Scores

POST /api/scores           // Submit new score  
GET /api/users/:id/scores  // Get scores for a user  
GET /api/games/:id/scores  // Get scores for a game  

## Leaderboards

GET /api/leaderboards/global        // Global leaderboard (top users across all games)  
GET /api/leaderboards/guilds        // Guild leaderboard (top guilds)  
GET /api/leaderboards/games/:id     // Game-specific leaderboard (top users in a game)  
GET /api/leaderboards/games/:id/guilds // Game-specific guild leaderboard  
