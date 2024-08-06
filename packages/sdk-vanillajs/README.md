# VanillaJS SDK

Native Web Component and vanillaJS/Typescript SDK (framework agnostic)

## Quick Start

Register the webcomponent in your app

```js
import "@happychain/js";
```

then include somewhere in your html

```html
<!doctype html>
<html lang="en">
	<body>
		<happy-wallet></happy-wallet>
	</body>
</html>
```

Alternatively, you can call `register` to auto-register the component on the page

```js
import { register } from "@happychain/js";

register();
```

## User Updates

to subscribe to user updates (log in/log out) you may import the `onUserUpdate` action

```js
import { onUserUpdate } from "@happychain/js";

onUserUpdate((user) => {
	if (!user) {
		// user has logged out
		return;
	}

	// various user properties are available if the user is logged in
	// check HappyUser type for more details
	// user.email
	// user.address
	// user.name
});
```
