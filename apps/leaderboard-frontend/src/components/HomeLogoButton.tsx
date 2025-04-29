import { Link } from "react-router-dom"
import logo from "../../public/happychain.png"

const HomeLogoButton = () => (
    <Link to="/" className="home-logo-btn" aria-label="Home">
        <img src={logo} alt="HappyChain Home" className="home-logo-img" />
    </Link>
)

export default HomeLogoButton
