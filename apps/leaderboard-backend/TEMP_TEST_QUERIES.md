# USERS

1. Create a User (POST /users)

    ```bash
    curl -X POST http://localhost:8787/users \
    -H "Content-Type: application/json" \
    -d '{
        "happy_wallet": "0x1111111111111111111111111111111111111111",
        "username": "alice"
    }'
    ```

2. Get User by Wallet (GET /users?happy_wallet=...)

    ```bash
    curl "http://localhost:8787/users?happy_wallet=0x1111111111111111111111111111111111111111"
    ```

3. Get User by Username (GET /users?username=alice)

    ```bash
    curl "http://localhost:8787/users?username=alice"
    ```

4. Update Username (PATCH /users/:happy_wallet)

    ```bash
    curl -X PATCH http://localhost:8787/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{
        "username": "alice_new"
    }'
    ```

5. Update Guild (PATCH /users/:happy_wallet)

    ```bash
    curl -X PATCH http://localhost:8787/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{
        "guild_id": 1
    }'
    (Replace 1 with a valid guild ID in your DB.)
    ```

6. Get All Users of a Guild (GET /users?guild_id=1)

    ```bash
    curl "http://localhost:8787/users?guild_id=1"
    ```

7. Get User by All Filters (GET /users?happy_wallet=...&username=alice_new&guild_id=1)

    ```bash
    curl "http://localhost:8787/users?happy_wallet=0x1111111111111111111111111111111111111111&username=alice_new&guild_id=1"
    ```

8. Try Invalid Update (should error)

    ```bash
    curl -X PATCH http://localhost:8787/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{}'
    ```

9. Attempt to Update happy_wallet (should error)

    ```bash
    curl -X PATCH http://localhost:8787/users/0x1111111111111111111111111111111111111111 \
    -H "Content-Type: application/json" \
    -d '{
        "happy_wallet": "0x2222222222222222222222222222222222222222"
    }'
    ```

10. Delete User (DELETE /users/:happy_wallet)

    ```bash
    curl -X DELETE http://localhost:8787/users/0x1111111111111111111111111111111111111111
    ```
