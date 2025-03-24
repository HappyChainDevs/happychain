import {
    type ColumnUpdateNode,
    type KyselyPlugin,
    type OperationNode,
    OperationNodeTransformer,
    type PluginTransformQueryArgs,
    type PluginTransformResultArgs,
    type PrimitiveValueListNode,
    type QueryResult,
    type RootOperationNode,
    type UnknownRow,
    type ValueNode,
} from "kysely"

export type TransformerRule =
    | {
          to(value: unknown): unknown
      }
    | {
          from(value: unknown): unknown
      }

export type TransformerRules = Record<string, TransformerRule>

export class SerializePlugin implements KyselyPlugin {
    transformer: ParametersTransformer

    constructor(private rules: TransformerRules) {
        this.transformer = new ParametersTransformer(rules)
    }

    public transformQuery({ node }: PluginTransformQueryArgs): RootOperationNode {
        return this.transformer.transformNode(node)
    }

    public async transformResult({ result }: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
        return { ...result, rows: this.parseRows(result.rows) }
    }

    private parseRows(rows: UnknownRow[]): UnknownRow[] {
        const result: UnknownRow[] = []
        for (const row of rows) {
            if (!row) {
                continue
            }
            const parsedRow: UnknownRow = {}
            for (const [key, value] of Object.entries(row)) {
                parsedRow[key] = this.deserialize(value)
            }
            result.push(parsedRow)
        }
        return result
    }

    private deserialize(value: unknown) {
        const rule = this.rules[typeof value]
        if (!rule || !("to" in rule)) return value
        return rule.to(value)
    }
}

class ParametersTransformer extends OperationNodeTransformer {
    public constructor(private rules: TransformerRules) {
        super()
    }

    private serializer(value: unknown) {
        const rule = this.rules[typeof value]
        if (!rule || !("from" in rule)) return value
        return rule.from(value)
    }

    private isValueNode(node: OperationNode): node is ValueNode {
        return node.kind === "ValueNode"
    }

    protected override transformPrimitiveValueList(node: PrimitiveValueListNode): PrimitiveValueListNode {
        return {
            ...node,
            values: node.values.map(this.serializer.bind(this)),
        }
    }

    protected override transformColumnUpdate(node: ColumnUpdateNode): ColumnUpdateNode {
        const { value: valueNode } = node

        if (!this.isValueNode(valueNode)) {
            return super.transformColumnUpdate(node)
        }

        const { value, ...item } = valueNode

        const serializedValue = this.serializer(value)

        return value === serializedValue
            ? super.transformColumnUpdate(node)
            : super.transformColumnUpdate({
                  ...node,
                  value: { ...item, value: serializedValue } as ValueNode,
              })
    }

    protected override transformValue(node: ValueNode): ValueNode {
        return {
            ...node,
            value: this.serializer(node.value),
        }
    }
}
