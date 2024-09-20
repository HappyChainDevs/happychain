"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
const { Migration } = require("@mikro-orm/migrations")

class Migration20240924123830 extends Migration {
    async up() {
        this.addSql(
            "create table `transaction` (`intent_id` text not null, `chain_id` integer not null, `address` text not null, `function_name` text not null, `args` text not null, `contract_name` text not null, primary key (`intent_id`));",
        )
    }
}
exports.Migration20240924123830 = Migration20240924123830
