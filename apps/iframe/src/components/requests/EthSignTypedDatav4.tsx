import { isAddress, stringify } from "@happy.tech/common"
import type { TypedData, TypedDataDomain } from "viem"
import { getAppURL } from "#src/utils/appURL.ts"
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
                        <div key={stringify(item)} className="py-1">
                            {typeof item === "string" && isAddress(item) ? (
                                <LinkToAddress address={item}>{item}</LinkToAddress>
                            ) : (
                                stringify(item)
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
                    <span className={value ? "text-success" : "text-error"}>{stringify(value)}</span>
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
            <FormattedDetailsLine>{stringify(value)}</FormattedDetailsLine>
        </>
    )
}

/**
 * Format and display important domain information from the EIP-712 data.
 */
function renderDomainInfo(domain: TypedDataDomain) {
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
                {(typeof domain.chainId === "number" || typeof domain.chainId === "bigint") && (
                    <div>
                        <SubsectionTitle>Chain ID</SubsectionTitle>
                        <FormattedDetailsLine>{stringify(domain.chainId)}</FormattedDetailsLine>
                    </div>
                )}
                {typeof domain.verifyingContract === "string" && isAddress(domain.verifyingContract) && (
                    <div>
                        <SubsectionTitle>Contract</SubsectionTitle>
                        <FormattedDetailsLine>
                            <LinkToAddress address={domain.verifyingContract}>{domain.verifyingContract}</LinkToAddress>
                        </FormattedDetailsLine>
                    </div>
                )}
                {domain.salt && (
                    <div>
                        <SubsectionTitle>Salt</SubsectionTitle>
                        <FormattedDetailsLine>{domain.salt}</FormattedDetailsLine>
                    </div>
                )}
            </SubsectionContent>
        </SubsectionBlock>
    )
}

/**
 * Recursively renders an EIP-712 structured data message.
 *
 * This function walks the `types` definition provided in the typed data schema and
 * matches it against the corresponding values in the `message` field.
 */
function renderTypedMessage(types: TypedData, typeName: string, message: Record<string, unknown>) {
    const fields = types[typeName]
    if (!fields) return null

    return fields.map(({ name, type }) => {
        const value = message[name]

        if (type.endsWith("[]") && Array.isArray(value)) {
            const baseType = type.slice(0, -2)
            if (types[baseType as keyof typeof types]) {
                return (
                    <SubsectionBlock key={name}>
                        <SubsectionTitle>{name}</SubsectionTitle>
                        {value.map((item, index) =>
                            isObject(item) ? (
                                <div key={String(item)} className="pl-2 border-l-2 border-neutral/20 mt-2">
                                    <div className="text-xs opacity-50 mb-1">Item {index + 1}</div>
                                    {renderTypedMessage(types, baseType, item)}
                                </div>
                            ) : null,
                        )}
                    </SubsectionBlock>
                )
            }
        }

        // Check if this is a custom type defined in the types object
        const customType = type.split("[")[0] // Remove array notation if present
        if (types[customType as keyof typeof types] && isObject(value)) {
            return (
                <SubsectionBlock key={name}>
                    <SubsectionTitle>{name}</SubsectionTitle>
                    {renderTypedMessage(types, customType, value)}
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
    const [, rawMessage] = params
    const parsed = typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage

    const origin = getAppURL()

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

                <SubsectionBlock>
                    <SubsectionTitle>Interacting with</SubsectionTitle>
                    <FormattedDetailsLine>
                        <LinkToAddress address={parsed.domain.verifyingContract} />
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
