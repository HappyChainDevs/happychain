import { useAtomValue } from "jotai"
import { userAtom } from "#src/state/user"

const UserDetails = () => {
    const user = useAtomValue(userAtom)
    return (
        <section className="leading-relaxed">
            <p>{user?.email}</p>
            <p>
                {user?.address.slice(0, 8)} ... {user?.address.slice(-8)}
            </p>
        </section>
    )
}

export default UserDetails
