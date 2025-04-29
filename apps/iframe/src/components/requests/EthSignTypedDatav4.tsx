import type { Address } from "@happy.tech/common"
import { isAddress } from "viem"
import DisclosureSection from "./common/DisclosureSection"
import {
    FormattedDetailsLine,
    Layout,
    LinkToAddress,
    SectionBlock,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

type TypedData = {
    domain: Record<string, unknown>
    types: Record<string, { name: string; type: string }[]>
    primaryType: string
    message: Record<string, unknown>
}

/**
 * Utility guard to determine if a given value is a non-null object (excluding arrays).
 *
 * This is used to safely recurse into nested structs defined in EIP-712 typed data.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Renders an individual field in the EIP-712 message.
 *
 * If the field is a valid Ethereum address, it is rendered with a clickable explorer link.
 * Boolean values are color-coded. Arrays are iterated.
 * Otherwise, it is displayed as a plain string.
 */
function renderField(label: string, value: unknown) {
    if (Array.isArray(value)) {
        return (
            <>
                <SubsectionTitle>{label}</SubsectionTitle>
                <FormattedDetailsLine>
                    {value.map((item) => (
                        <div key={String(item)} className="py-1">
                            {typeof item === "string" && isAddress(item) ? (
                                <LinkToAddress address={item}>{item}</LinkToAddress>
                            ) : (
                                String(item)
                            )}
                        </div>
                    ))}
                </FormattedDetailsLine>
            </>
        )
    }

    if (typeof value === "boolean") {
        return (
            <>
                <SubsectionTitle>{label}</SubsectionTitle>
                <FormattedDetailsLine>
                    <span className={value ? "text-green-500" : "text-red-500"}>{String(value)}</span>
                </FormattedDetailsLine>
            </>
        )
    }

    if (typeof value === "string" && isAddress(value)) {
        return (
            <>
                <SubsectionTitle>{label}</SubsectionTitle>
                <FormattedDetailsLine>
                    <LinkToAddress address={value}>{value}</LinkToAddress>
                </FormattedDetailsLine>
            </>
        )
    }

    return (
        <>
            <SubsectionTitle>{label}</SubsectionTitle>
            <FormattedDetailsLine>{String(value)}</FormattedDetailsLine>
        </>
    )
}

/**
 * Format and display important domain information from the EIP-712 data.
 */
function renderDomainInfo(domain: Record<string, unknown>) {
    return (
        <SubsectionBlock>
            <SubsectionTitle>Domain Information</SubsectionTitle>
            <SubsectionContent>
                {typeof domain.name === "string" && (
                    <div>
                        <SubsectionTitle>Application</SubsectionTitle>
                        <FormattedDetailsLine>{domain.name}</FormattedDetailsLine>
                    </div>
                )}
                {typeof domain.version === "string" && (
                    <div>
                        <SubsectionTitle>Version</SubsectionTitle>
                        <FormattedDetailsLine>{domain.version}</FormattedDetailsLine>
                    </div>
                )}
                {(typeof domain.chainId === "number" || typeof domain.chainId === "string") && (
                    <div>
                        <SubsectionTitle>Chain ID</SubsectionTitle>
                        <FormattedDetailsLine>{String(domain.chainId)}</FormattedDetailsLine>
                    </div>
                )}
                {typeof domain.verifyingContract === "string" && isAddress(domain.verifyingContract) && (
                    <div>
                        <SubsectionTitle>Contract</SubsectionTitle>
                        <FormattedDetailsLine>
                            <LinkToAddress address={domain.verifyingContract as Address}>
                                {domain.verifyingContract}
                            </LinkToAddress>
                        </FormattedDetailsLine>
                    </div>
                )}
            </SubsectionContent>
        </SubsectionBlock>
    )
}

/**
 * Identify and display the potential purpose of this signature request
 * based on common EIP-712 patterns.
 */
function identifySignaturePurpose(typedData: TypedData): React.ReactNode {
    const { primaryType, types, message } = typedData

    if (primaryType === "Permit" && types.Permit) {
        const permitFields = types.Permit.map((f) => f.name)
        if (permitFields.includes("owner") && permitFields.includes("spender") && permitFields.includes("value")) {
            return (
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-md text-xs">
                    <p className="font-medium">You're approving an ERC-20 token allowance</p>
                    <p className="opacity-75">This signature allows the spender to use your tokens.</p>
                </div>
            )
        }
    }

    if (primaryType.includes("Order") && typeof message.maker === "object" && message.maker !== null) {
        return (
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md text-xs">
                <p className="font-medium">You're signing a marketplace order</p>
                <p className="opacity-75">This creates an off-chain listing or offer for assets.</p>
            </div>
        )
    }

    return null
}

/**
 * Recursively renders an EIP-712 structured data message.
 *
 * This function walks the `types` definition provided in the typed data schema and
 * matches it against the corresponding values in the `message` field.
 */
function renderTypedMessage(typeDef: TypedData["types"], typeName: string, message: Record<string, unknown>) {
    const fields = typeDef[typeName]
    if (!fields) return null

    return fields.map(({ name, type }) => {
        const value = message[name]

        if (type.endsWith("[]") && Array.isArray(value)) {
            const baseType = type.slice(0, -2)
            if (typeDef[baseType]) {
                return (
                    <SubsectionBlock key={name}>
                        <SubsectionTitle>{name}</SubsectionTitle>
                        {value.map((item, index) =>
                            isObject(item) ? (
                                <div key={String(item)} className="pl-2 border-l-2 border-neutral/20 mt-2">
                                    <div className="text-xs opacity-50 mb-1">Item {index + 1}</div>
                                    {renderTypedMessage(typeDef, baseType, item)}
                                </div>
                            ) : null,
                        )}
                    </SubsectionBlock>
                )
            }
        }

        if (typeDef[type] && isObject(value)) {
            return (
                <SubsectionBlock key={name}>
                    <SubsectionTitle>{name}</SubsectionTitle>
                    {renderTypedMessage(typeDef, type, value)}
                </SubsectionBlock>
            )
        }

        return (
            <SubsectionBlock key={name}>
                <SubsectionContent>{renderField(name, value)}</SubsectionContent>
            </SubsectionBlock>
        )
    })
}

/**
 * Component to render a confirmation UI for an `eth_signTypedData_v4` request.
 *
 * This request type is used to sign EIP-712 structured data on Ethereum.
 * The component breaks down and visualizes domain details, message fields, and provides raw JSON.
 */
export const EthSignTypedDataV4 = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_signTypedData_v4">) => {
    const [_signerAddress, rawMessage] = params
    const parsed: TypedData = typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage

    const origin = window.location.hostname === "localhost" ? "http://localhost:6002" : window.location.origin

    const signatureHint = identifySignaturePurpose(parsed)
    const isHighRiskSignature = false // Placeholder for heuristics

    return (
        <Layout
            headline={<>Signature Request</>}
            description={<>Please review the message you are about to sign.</>}
            actions={{
                accept: {
                    children: "Sign",
                    onClick: () => accept({ method, params }),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        >
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionTitle>Origin</SubsectionTitle>
                    <FormattedDetailsLine>{origin}</FormattedDetailsLine>
                </SubsectionBlock>

                {signatureHint && <div className="mb-2">{signatureHint}</div>}

                {isHighRiskSignature && (
                    <div className="mb-2 bg-red-100 dark:bg-red-900/30 p-2 rounded-md text-xs">
                        <p className="font-medium text-red-700 dark:text-red-400">⚠️ High-risk signature detected</p>
                        <p>This signature could potentially allow access to your assets. Verify carefully.</p>
                    </div>
                )}

                <SubsectionBlock>
                    <SubsectionTitle>Interacting with</SubsectionTitle>
                    <FormattedDetailsLine>
                        <LinkToAddress address={parsed.domain.verifyingContract as Address} />
                    </FormattedDetailsLine>
                </SubsectionBlock>

                {renderDomainInfo(parsed.domain)}

                <SubsectionBlock>
                    <SubsectionTitle>Message Type</SubsectionTitle>
                    <FormattedDetailsLine>{parsed.primaryType}</FormattedDetailsLine>
                </SubsectionBlock>

                <SubsectionBlock>
                    <SubsectionTitle>Message</SubsectionTitle>
                    {renderTypedMessage(parsed.types, parsed.primaryType, parsed.message)}
                </SubsectionBlock>
            </SectionBlock>

            <DisclosureSection title="Raw Request">
                <div className="grid gap-4 p-2">
                    <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                </div>
            </DisclosureSection>
        </Layout>
    )
}
