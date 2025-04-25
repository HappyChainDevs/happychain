# API Curls

## USERS

1. Create a User (POST /users)

    ```bash
    curl -X POST http://localhost:4545/users \
    -H "Content-Type: application/json" \
    -d '{
        "happy_wallet": "0x1111111111111111111111111111111111111111",
        "username": "alice"
    }'
    ```

2. Get User by Wallet (GET /users?happy_wallet=...)

    ```bash
    curl "http://localhost:4545/users?happy_wallet=0x1111111111111111111111111111111111111111"
    ```

3. Get User by Username (GET /users?username=alice)

    ```bash
    curl "http://localhost:4545/users?username=alice"
    ```

4. Update Username (PATCH /users/:happy_wallet)

    ```bash
    curl -X PATCH http://localhost:4545/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{
        "username": "alice_new"
    }'
    ```

5. Update Guild (PATCH /users/:happy_wallet)

    ```bash
    curl -X PATCH http://localhost:4545/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{
        "guild_id": 1
    }'
    (Replace 1 with a valid guild ID in your DB.)
    ```

6. Get All Users of a Guild (GET /users?guild_id=1)

    ```bash
    curl "http://localhost:4545/users?guild_id=1"
    ```

7. Get User by All Filters (GET /users?happy_wallet=...&username=alice_new&guild_id=1)

    ```bash
    curl "http://localhost:4545/users?happy_wallet=0x1111111111111111111111111111111111111111&username=alice_new&guild_id=1"
    ```

8. Try Invalid Update (should error)

    ```bash
    curl -X PATCH http://localhost:4545/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{}'
    ```

9. Attempt to Update happy_wallet (should error)

    ```bash
    curl -X PATCH http://localhost:4545/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{
        "happy_wallet": "0x2222222222222222222222222222222222222222"
    }'
    ```

10. Delete User (DELETE /users/:happy_wallet)

    ```bash
    curl -X DELETE http://localhost:4545/users/0x1111111111111111111111111111111111111111
    ```

## GUILDS

1. Create a Guild (POST /guilds)

    ```bash
    curl -X POST http://localhost:4545/guilds \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Guild of Heroes",
        "admin_wallet": "0x1111111111111111111111111111111111111111"
    }'
    ```

2. Get Guild by ID (GET /guilds/:id)

    ```bash
    curl -X GET "http://localhost:4545/guilds/1"
    ```

3. Update Guild Name (PATCH /guilds/:id)

    ```bash
    curl -X PATCH http://localhost:4545/guilds/1 \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Guild of Legends"
    }'
    ```

4. Delete Guild (DELETE /guilds/:id)

    ```bash
    curl -X DELETE http://localhost:4545/guilds/1
    ```

5. List Guilds by Admin (GET /guilds?admin_id=1)

    ```bash
    curl -X GET "http://localhost:4545/guilds?admin_id=1"
    ```

6. List Guild by Name (GET /guilds?name=Guild%20of%20Legends)

    ```bash
    curl -X GET "http://localhost:4545/guilds?name=Guild%20of%20Legends"
    ```

7. Try Invalid Create (should error)

    ```bash
    curl -X POST http://localhost:4545/guilds \
    -H "Content-Type: application/json" \
    -d '{ "name": "", "admin_wallet": "" }'
    ```
