"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
const { Migration } = require("@mikro-orm/migrations")

class Migration20240926095620 extends Migration {
    async up() {
        this.addSql("alter table `transaction` add column `deadline` integer null;")
    }
}
exports.Migration20240926095620 = Migration20240926095620
