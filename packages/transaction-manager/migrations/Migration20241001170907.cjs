"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
const { Migration } = require("@mikro-orm/migrations")

class Migration20241001170907 extends Migration {
    async up() {
        this.addSql(`alter table "transaction" add column "status" text not null;`)
        this.addSql(`alter table "transaction" add column "attempts" json not null;`)
    }
}
exports.Migration20241001170907 = Migration20241001170907
