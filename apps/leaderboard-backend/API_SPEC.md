# API Routes structure

## User management

POST /users                    // Create new user  
GET /users/:id                 // Get user by ID  
PATCH /users/:id               // Update user details  
GET /users                     // List users (with filtering)  

## User wallets

POST /users/:id/wallets             // Add wallet to user  
GET /users/:id/wallets              // Get user's wallets  
DELETE /users/:id/wallets/:addr     // Remove wallet from user  
PATCH /users/:id/wallets/:addr      // Set wallet as primary  

## Guild management

POST /guilds                    // Create new guild (creator becomes admin)  
GET /guilds/:id                 // Get guild by ID  
PATCH /guilds/:id               // Update guild details (admin only)  
GET /guilds                     // List guilds (with filtering)  

## Guild membership

POST /guilds/:id/members            // Add member to guild (admin only)  
GET /guilds/:id/members             // List guild members  
DELETE /guilds/:id/members/:userId  // Remove member from guild (admin only)  
PATCH /guilds/:id/members/:userId   // Update member role (admin only)  
GET /users/:id/guilds               // Get guilds a user belongs to  

## Games

POST /games                    // Create new game  
GET /games/:id                 // Get game by ID  
GET /games/admin/:admin_wallet // List games by admin wallet  
PATCH /games/:id               // Update game details (admin only)  
GET /games                     // List games (with filtering)  

## Scores

POST /games/:id/scores           // Submit new score  
GET /games/:id/scores/:id        // Get scores for a user  
GET /games/:id/scores            // Get scores for a game  

## Leaderboards

GET /leaderboards/global           // Global leaderboard (top users across all games)  
GET /leaderboards/guilds           // Guild leaderboard (top guilds)  
GET /leaderboards/games/:id        // Game-specific leaderboard (top users in a game)  
GET /leaderboards/games/:id/guilds // Game-specific guild leaderboard  
