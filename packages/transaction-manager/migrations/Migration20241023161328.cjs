"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
const { Migration } = require("@mikro-orm/migrations")

class Migration20241023161328 extends Migration {
    async up() {
        this.addSql("alter table `transaction` add column `metadata` json null;")
    }
}
exports.Migration20241023161328 = Migration20241023161328
