import { useAtomValue } from "jotai"
import { userAtom } from "#src/state/user"

const UserDetails = () => {
    const user = useAtomValue(userAtom)
    return (
        <div>
            {user?.email}
            <br />
            {user?.address.slice(0, 8)} ... {user?.address.slice(-8)}
        </div>
    )
}

export default UserDetails
