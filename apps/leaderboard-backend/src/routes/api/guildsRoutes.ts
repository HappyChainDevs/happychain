import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import type { GuildTableId, UserTableId } from "../../db/types"
import {
    GuildCreateRequestSchema,
    GuildIdParamSchema,
    GuildMemberAddRequestSchema,
    GuildMemberParamSchema,
    GuildMemberUpdateRequestSchema,
    GuildQuerySchema,
    GuildUpdateRequestSchema,
} from "../../validation/schema/guildSchema"

export default new Hono()

    // GET /guilds - List guilds (with filtering)
    .get("/", zValidator("query", GuildQuerySchema), async (c) => {
        try {
            console.log("reached GET /guilds", c.req.query())
            const query = c.req.valid("query")
            const { guildRepo } = c.get("repos")

            const guilds = await guildRepo.find({
                name: query.name,
                creator_id: query.creator_id,
                includeMembers: query.include_members,
            })

            console.log("returning: ", guilds)

            return c.json({ ok: true, data: guilds })
        } catch (err) {
            console.log("getting error here")
            console.error("Error listing guilds:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /guilds/:id - Get guild by ID
    .get("/:id", zValidator("param", GuildIdParamSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")

            const { guildRepo } = c.get("repos")
            const includeMembers = c.req.query("include_members") === "true"

            const guild = await guildRepo.findById(id as GuildTableId, includeMembers)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            return c.json({ ok: true, data: guild })
        } catch (err) {
            console.error(`Error fetching guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // POST /guilds - Create new guild (creator becomes admin)
    .post("/", zValidator("json", GuildCreateRequestSchema), async (c) => {
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
                creator_id: guildData.creator_id,
            })

            return c.json({ ok: true, data: newGuild }, 201)
        } catch (err) {
            console.error("Error creating guild:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // PATCH /guilds/:id - Update guild details (admin only)
    .patch("/:id", zValidator("param", GuildIdParamSchema), zValidator("json", GuildUpdateRequestSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")

            const updateData = c.req.valid("json")
            const { guildRepo } = c.get("repos")

            // Check if guild exists
            const guild = await guildRepo.findById(id as GuildTableId)
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

            const updatedGuild = await guildRepo.update(id as GuildTableId, updateData)
            return c.json({ ok: true, data: updatedGuild })
        } catch (err) {
            console.error(`Error updating guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /guilds/:id/members - List guild members
    .get("/:id/members", zValidator("param", GuildIdParamSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")

            const { guildRepo } = c.get("repos")

            // Check if guild exists
            const guild = await guildRepo.findById(id as GuildTableId)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            const members = await guildRepo.getGuildMembersWithUserDetails(id as GuildTableId)
            return c.json({ ok: true, data: members })
        } catch (err) {
            console.error(`Error fetching members for guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // POST /guilds/:id/members - Add member to guild (admin only)
    .post(
        "/:id/members",
        zValidator("param", GuildIdParamSchema),
        zValidator("json", GuildMemberAddRequestSchema),
        async (c) => {
            try {
                const { id } = c.req.valid("param")

                const { user_id, is_admin } = c.req.valid("json")
                const { guildRepo, userRepo } = c.get("repos")

                // Check if guild exists
                const guild = await guildRepo.findById(id as GuildTableId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Check if user exists
                const user = await userRepo.findById(user_id)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Add member to guild
                const member = await guildRepo.addMember(id as GuildTableId, user_id, is_admin || false)
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

    // PATCH /guilds/:id/members/:userId - Update member role (admin only)
    .patch(
        "/:id/members/:userId",
        zValidator("param", GuildMemberParamSchema),
        zValidator("json", GuildMemberUpdateRequestSchema),
        async (c) => {
            try {
                const { id, userId } = c.req.valid("param")

                const { is_admin } = c.req.valid("json")
                const { guildRepo } = c.get("repos")

                // Check if guild exists
                const guild = await guildRepo.findById(id as GuildTableId)
                if (!guild) {
                    return c.json({ ok: false, error: "Guild not found" }, 404)
                }

                // Update member role
                const updatedMember = await guildRepo.updateMemberRole(id, userId, is_admin)
                if (!updatedMember) {
                    return c.json({ ok: false, error: "Member not found in guild" }, 404)
                }

                return c.json({ ok: true, data: updatedMember })
            } catch (err) {
                console.error(`Error updating member role in guild ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // DELETE /guilds/:id/members/:userId - Remove member from guild (admin only)
    .delete("/:id/members/:userId", zValidator("param", GuildMemberParamSchema), async (c) => {
        try {
            const { id, userId } = c.req.valid("param")

            const { guildRepo } = c.get("repos")

            // Check if guild exists
            const guild = await guildRepo.findById(id as GuildTableId)
            if (!guild) {
                return c.json({ ok: false, error: "Guild not found" }, 404)
            }

            // Remove member from guild
            const removedMember = await guildRepo.removeMember(id, userId)
            if (!removedMember) {
                return c.json(
                    {
                        ok: false,
                        error: "Cannot remove member: user may be the guild creator or not a member",
                    },
                    400,
                )
            }

            return c.json({ ok: true, data: { removed: true } })
        } catch (err) {
            console.error(`Error removing member from guild ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /users/:id/guilds - Get guilds a user belongs to
    .get("/users/:id/guilds", async (c) => {
        try {
            const userId = Number(c.req.param("id"))
            if (Number.isNaN(userId)) {
                return c.json({ ok: false, error: "Invalid user ID" }, 400)
            }

            const { guildRepo, userRepo } = c.get("repos")

            // Check if user exists
            const user = await userRepo.findById(userId as UserTableId)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const guilds = await guildRepo.getUserGuilds(userId as UserTableId)
            return c.json({ ok: true, data: guilds })
        } catch (err) {
            console.error(`Error fetching guilds for user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })
