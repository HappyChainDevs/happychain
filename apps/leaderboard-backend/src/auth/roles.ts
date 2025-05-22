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

export enum ResourceType {
    USER = "user",
    GUILD = "guild",
    GAME = "game",
    SCORE = "score",
}

export enum ActionType {
    READ = "read",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    MANAGE = "manage",
    ADD_MEMBER = "add_member",
    REMOVE_MEMBER = "remove_member",
    PROMOTE_MEMBER = "promote_member",
    LEAVE = "leave",
    SUBMIT_SCORE = "submit_score",
    MANAGE_SCORES = "manage_scores",
}

export const Permissions: Record<ResourceType, Partial<Record<ActionType, RoleType[]>>> = {
    [ResourceType.USER]: {
        [ActionType.READ]: [UserRole.AUTHENTICATED, UserRole.SELF],
        [ActionType.CREATE]: [UserRole.AUTHENTICATED],
        [ActionType.UPDATE]: [UserRole.SELF],
        [ActionType.DELETE]: [UserRole.SELF],
        [ActionType.MANAGE]: [UserRole.SELF],
    },
    [ResourceType.GUILD]: {
        [ActionType.READ]: [UserRole.AUTHENTICATED],
        [ActionType.CREATE]: [UserRole.AUTHENTICATED],
        [ActionType.UPDATE]: [GuildRole.ADMIN, GuildRole.CREATOR],
        [ActionType.DELETE]: [GuildRole.CREATOR],
        [ActionType.ADD_MEMBER]: [GuildRole.ADMIN, GuildRole.CREATOR],
        [ActionType.REMOVE_MEMBER]: [GuildRole.ADMIN, GuildRole.CREATOR],
        [ActionType.PROMOTE_MEMBER]: [GuildRole.CREATOR],
        [ActionType.LEAVE]: [GuildRole.MEMBER, GuildRole.ADMIN],
    },
    [ResourceType.GAME]: {
        [ActionType.READ]: [UserRole.AUTHENTICATED],
        [ActionType.CREATE]: [UserRole.AUTHENTICATED],
        [ActionType.UPDATE]: [GameRole.CREATOR],
        [ActionType.DELETE]: [GameRole.CREATOR],
        [ActionType.SUBMIT_SCORE]: [UserRole.AUTHENTICATED],
        [ActionType.MANAGE_SCORES]: [GameRole.CREATOR],
    },
    [ResourceType.SCORE]: {},
}

export type RoleType = UserRole | GuildRole | GameRole
