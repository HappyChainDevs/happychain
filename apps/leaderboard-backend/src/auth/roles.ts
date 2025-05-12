export enum UserRole {
    AUTHENTICATED = "authenticated", // Any authenticated user
    SELF = "self", // The user themselves (for self-management)
}

export enum GuildRole {
    MEMBER = "member", // Regular guild member
    ADMIN = "admin", // Guild admin (can manage members)
    CREATOR = "creator", // Guild creator (can delete guild)
}

export enum GameRole {
    PLAYER = "player", // Regular player (can submit scores)
    CREATOR = "creator", // Game creator (can manage game)
}

export const Permissions = {
    User: {
        READ: [UserRole.AUTHENTICATED, UserRole.SELF], // Anyone can read user profiles
        CREATE: [UserRole.AUTHENTICATED], // Any authenticated user can create a profile
        UPDATE: [UserRole.SELF], // Only the user can update their profile
        DELETE: [UserRole.SELF], // Only the user can delete their profile
        MANAGE_WALLETS: [UserRole.SELF], // Only the user can manage their wallets
    },

    Guild: {
        READ: [UserRole.AUTHENTICATED], // Anyone can read guild info
        CREATE: [UserRole.AUTHENTICATED], // Any authenticated user can create a guild
        UPDATE: [GuildRole.ADMIN, GuildRole.CREATOR], // Admins and creators can update guild
        DELETE: [GuildRole.CREATOR], // Only creator can delete guild
        ADD_MEMBER: [GuildRole.ADMIN, GuildRole.CREATOR], // Admins and creators can add members
        REMOVE_MEMBER: [GuildRole.ADMIN, GuildRole.CREATOR], // Admins and creators can remove members
        PROMOTE_MEMBER: [GuildRole.CREATOR], // Only creator can promote members to admin
    },

    Game: {
        READ: [UserRole.AUTHENTICATED], // Anyone can read game info
        CREATE: [UserRole.AUTHENTICATED], // Any authenticated user can create a game
        UPDATE: [GameRole.CREATOR], // Only creator can update game
        DELETE: [GameRole.CREATOR], // Only creator can delete game
        SUBMIT_SCORE: [UserRole.AUTHENTICATED], // Any authenticated user can submit scores
        MANAGE_SCORES: [GameRole.CREATOR], // Only creator can manage/delete scores
    },
}

export type RoleType = UserRole | GuildRole | GameRole
export type ResourceType = "user" | "guild" | "game" | "score"
export type ActionType = "read" | "create" | "update" | "delete" | "manage"
