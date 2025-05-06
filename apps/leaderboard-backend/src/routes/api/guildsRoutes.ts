import { Hono } from "hono"
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
    GuildMemberParamValidation,
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

            return c.json(guilds, 200)
        } catch (err) {
            console.error("Error listing guilds:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Create a new guild (creator becomes admin).
     * POST /guilds
     */
    .post("/", GuildCreateDescription, GuildCreateValidation, async (c) => {
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

            return c.json(newGuild, 201)
        } catch (err) {
            console.error("Error creating guild:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Get a guild by ID (optionally include members).
     * GET /guilds/:id
     */
    .get("/:id", GuildGetByIdDescription, GuildIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")

            const { guildRepo } = c.get("repos")
            const includeMembers = c.req.query("include_members") === "true"

            const guildId = Number.parseInt(id, 10) as GuildTableId
            const guild = await guildRepo.findById(guildId, includeMembers)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            return c.json(guild, 200)
        } catch (err) {
            console.error(`Error fetching guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Update guild details (admin only).
     * PATCH /guilds/:id
     */
    .patch("/:id", GuildUpdateDescription, GuildIdParamValidation, GuildUpdateValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")

            const updateData = c.req.valid("json")
            const { guildRepo } = c.get("repos")

            // Check if guild exists
            const guildId = Number.parseInt(id, 10) as GuildTableId
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
            return c.json(updatedGuild, 200)
        } catch (err) {
            console.error(`Error updating guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

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
            const guildId = Number.parseInt(id, 10) as GuildTableId
            const guild = await guildRepo.findById(guildId)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            const members = await guildRepo.getGuildMembersWithUserDetails(guildId)
            return c.json(members, 200)
        } catch (err) {
            console.error(`Error fetching members for guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Add a member to a guild (admin only).
     * POST /guilds/:id/members
     */
    .post("/:id/members", GuildMemberAddDescription, GuildIdParamValidation, GuildMemberAddValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            let { user_id, username, is_admin } = c.req.valid("json")
            const { guildRepo, userRepo } = c.get("repos")

            // Ensure guild exists
            const guildId = Number.parseInt(id, 10) as GuildTableId
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
            const member = await guildRepo.addMember(guildId, user_id as UserTableId, is_admin || false)
            if (!member) {
                return c.json({ ok: false, error: "User is already a member of this guild" }, 409)
            }

            return c.json(member, 201)
        } catch (err) {
            console.error(`Error adding member to guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Update a guild member's role (admin only).
     * PATCH /guilds/:id/members/:user_id
     */
    .patch(
        "/:id/members/:user_id",
        GuildMemberUpdateDescription,
        GuildMemberParamValidation,
        GuildMemberUpdateValidation,
        async (c) => {
            try {
                const { id, user_id } = c.req.valid("param")

                const { is_admin } = c.req.valid("json")
                const { guildRepo } = c.get("repos")

                // Check if guild exists
                const guildId = Number.parseInt(id, 10) as GuildTableId
                const userId = Number.parseInt(user_id, 10) as UserTableId
                const guild = await guildRepo.findById(guildId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Update member role
                const updatedMember = await guildRepo.updateMemberRole(guildId, userId, is_admin)
                if (!updatedMember) {
                    return c.json({ ok: false, error: "Member not found in guild" }, 404)
                }

                return c.json(updatedMember, 200)
            } catch (err) {
                console.error(`Error updating member role in guild ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Remove a member from a guild (admin only).
     * DELETE /guilds/:id/members/:user_id
     */
    .delete("/:id/members/:user_id", GuildMemberDeleteDescription, GuildMemberParamValidation, async (c) => {
        try {
            const { id, user_id } = c.req.valid("param")

            const { guildRepo } = c.get("repos")

            // Check if guild exists
            const guildId = Number.parseInt(id, 10) as GuildTableId
            const userId = Number.parseInt(user_id, 10) as UserTableId
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

            return c.json({ removed: true }, 200)
        } catch (err) {
            console.error(`Error removing member from guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })
