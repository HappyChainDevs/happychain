import { Hono } from "hono"
import { ActionType, GuildRole, ResourceType, getGuildUserRole, requireAuth, requirePermission } from "../../auth"
import type { GuildTableId, UserTableId } from "../../db/types"
import {
    GuildCreateDescription,
    GuildCreateValidation,
    GuildGetByIdDescription,
    GuildIdParamValidation,
    GuildListMembersDescription,
    GuildMemberAddDescription,
    GuildMemberAddValidation,
    GuildMemberDeleteDescription,
    GuildMemberIdParamValidation,
    GuildMemberUpdateDescription,
    GuildMemberUpdateValidation,
    GuildQueryDescription,
    GuildQueryValidation,
    GuildUpdateDescription,
    GuildUpdateValidation,
} from "../../validation/guilds"

export default new Hono()

    // ====================================================================================================
    // Guild Collection Routes

    /**
     * List all guilds (optionally filter by name, creator, or include members).
     * GET /guilds
     */
    .get("/", GuildQueryDescription, GuildQueryValidation, async (c) => {
        try {
            const { name, creator_id, include_members } = c.req.valid("query")
            const { guildRepo } = c.get("repos")

            const guilds = await guildRepo.find({
                name: name ? name : undefined,
                creator_id: creator_id ? (creator_id as UserTableId) : undefined,
                includeMembers: include_members ? include_members : false,
            })

            return c.json({ ok: true, data: guilds }, 200)
        } catch (err) {
            console.error("Error listing guilds:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Create a new guild (creator becomes admin).
     * POST /guilds
     * @security BearerAuth
     */
    .post(
        "/",
        requireAuth,
        requirePermission({ resource: ResourceType.GUILD, action: ActionType.CREATE }),
        GuildCreateDescription,
        GuildCreateValidation,
        async (c) => {
            try {
                const guildData = c.req.valid("json")
                const { guildRepo } = c.get("repos")

                // Check if guild name already exists
                const existingGuilds = await guildRepo.findByName(guildData.name)
                if (existingGuilds.length > 0) {
                    return c.json({ ok: false, error: "Guild name already exists" }, 409)
                }

                const newGuild = await guildRepo.create({
                    name: guildData.name,
                    icon_url: guildData.icon_url || null,
                    creator_id: guildData.creator_id as UserTableId,
                })

                return c.json({ ok: true, data: newGuild }, 201)
            } catch (err) {
                console.error("Error creating guild:", err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Get a guild by ID (optionally include members).
     * GET /guilds/:id
     */
    .get("/:id", GuildGetByIdDescription, GuildIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")

            const { guildRepo } = c.get("repos")
            const includeMembers = c.req.query("include_members") === "true"

            const guildId = id as GuildTableId
            const guild = await guildRepo.findById(guildId, includeMembers)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            return c.json({ ok: true, data: guild }, 200)
        } catch (err) {
            console.error(`Error fetching guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Update guild details (admin only).
     * PATCH /guilds/:id
     * Requires ADMIN role in the guild
     * @security BearerAuth
     */
    .patch(
        "/:id",
        requireAuth,
        requirePermission({ resource: ResourceType.GUILD, action: ActionType.UPDATE, getUserRole: getGuildUserRole }),
        GuildUpdateDescription,
        GuildIdParamValidation,
        GuildUpdateValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")

                const updateData = c.req.valid("json")
                const { guildRepo } = c.get("repos")

                // Check if guild exists
                const guildId = id as GuildTableId
                const guild = await guildRepo.findById(guildId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Check if name is being changed and is unique
                if (updateData.name && updateData.name !== guild.name) {
                    const existingGuilds = await guildRepo.findByName(updateData.name)
                    if (existingGuilds.length > 0) {
                        return c.json({ ok: false, error: "Guild name already exists" }, 409)
                    }
                }

                const updatedGuild = await guildRepo.update(guildId, updateData)
                return c.json({ ok: true, data: updatedGuild }, 200)
            } catch (err) {
                console.error(`Error updating guild ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // ====================================================================================================
    // Guild Member Routes

    /**
     * List all members of a guild.
     * GET /guilds/:id/members
     */
    .get("/:id/members", GuildListMembersDescription, GuildIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")

            const { guildRepo } = c.get("repos")

            // Check if guild exists
            const guildId = id as GuildTableId
            const guild = await guildRepo.findById(guildId)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            const members = await guildRepo.getGuildMembersWithUserDetails(guildId)
            return c.json({ ok: true, data: members }, 200)
        } catch (err) {
            console.error(`Error fetching members for guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Add a member to a guild (admin only).
     * POST /guilds/:id/members
     * Requires ADMIN role in the guild
     * @security BearerAuth
     */
    .post(
        "/:id/members",
        requireAuth,
        requirePermission({
            resource: ResourceType.GUILD,
            action: ActionType.ADD_MEMBER,
            getUserRole: getGuildUserRole,
        }),
        GuildMemberAddDescription,
        GuildIdParamValidation,
        GuildMemberAddValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                let { user_id, username, role } = c.req.valid("json")
                const { guildRepo, userRepo } = c.get("repos")

                // Ensure guild exists
                const guildId = id as GuildTableId
                const guild = await guildRepo.findById(guildId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Resolve user_id from username if needed
                if (!user_id && username) {
                    const userByName = await userRepo.findByUsername(username)
                    if (!userByName) {
                        return c.json({ ok: false, error: "User not found by username" }, 404)
                    }
                    user_id = userByName.id
                }

                if (!user_id) {
                    return c.json({ ok: false, error: "User ID or username required" }, 400)
                }

                // Ensure user exists
                const user = await userRepo.findById(user_id as UserTableId)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Add member to guild
                const member = await guildRepo.addMember(guildId, user_id as UserTableId, role === GuildRole.ADMIN)
                if (!member) {
                    return c.json({ ok: false, error: "User is already a member of this guild" }, 409)
                }

                return c.json({ ok: true, data: member }, 201)
            } catch (err) {
                console.error(`Error adding member to guild ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Update a guild member's role (admin only).
     * PATCH /guilds/:id/members/:member_id
     * Requires ADMIN role in the guild
     * @security BearerAuth
     */
    .patch(
        "/:id/members/:member_id",
        requireAuth,
        requirePermission({
            resource: ResourceType.GUILD,
            action: ActionType.PROMOTE_MEMBER,
            getUserRole: getGuildUserRole,
        }),
        GuildMemberUpdateDescription,
        GuildIdParamValidation,
        GuildMemberIdParamValidation,
        GuildMemberUpdateValidation,
        async (c) => {
            try {
                const { id, member_id } = c.req.valid("param")

                const { role } = c.req.valid("json")
                const { guildRepo } = c.get("repos")

                // Check if guild exists
                const guildId = id as GuildTableId
                const userId = member_id as UserTableId
                const guild = await guildRepo.findById(guildId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Update member role
                const updatedMember = await guildRepo.updateMemberRole(guildId, userId, role)
                if (!updatedMember) {
                    return c.json({ ok: false, error: "Member not found in guild" }, 404)
                }

                return c.json({ ok: true, data: updatedMember }, 200)
            } catch (err) {
                console.error(`Error updating member role in guild ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Remove a member from a guild (admin only).
     * DELETE /guilds/:id/members/:member_id
     * Requires ADMIN role in the guild
     * @security BearerAuth
     */
    .delete(
        "/:id/members/:member_id",
        requireAuth,
        requirePermission({
            resource: ResourceType.GUILD,
            action: ActionType.REMOVE_MEMBER,
            getUserRole: getGuildUserRole,
        }),
        GuildMemberDeleteDescription,
        GuildIdParamValidation,
        GuildMemberIdParamValidation,
        async (c) => {
            try {
                const { id, member_id } = c.req.valid("param")

                const { guildRepo } = c.get("repos")

                // Check if guild exists
                const guildId = id as GuildTableId
                const userId = member_id as UserTableId
                const guild = await guildRepo.findById(guildId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Remove member from guild
                const removedMember = await guildRepo.removeMember(guildId, userId)
                if (!removedMember) {
                    return c.json(
                        {
                            ok: false,
                            error: "Cannot remove member: user may be the guild creator or not a member",
                        },
                        400,
                    )
                }

                return c.json({ ok: true, data: { removed: true } }, 200)
            } catch (err) {
                console.error(`Error removing member from guild ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )
