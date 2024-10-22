'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20241022141042 extends Migration {

  async up() {
    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`transaction__temp_alter\` (\`intent_id\` text not null, \`chain_id\` integer not null, \`address\` text not null, \`function_name\` text not null, \`args\` json null, \`contract_name\` text not null, \`deadline\` integer null, \`status\` text not null, \`attempts\` json not null, primary key (\`intent_id\`));`);
    this.addSql(`insert into \`transaction__temp_alter\` select * from \`transaction\`;`);
    this.addSql(`drop table \`transaction\`;`);
    this.addSql(`alter table \`transaction__temp_alter\` rename to \`transaction\`;`);
    this.addSql(`pragma foreign_keys = on;`);
  }

}
exports.Migration20241022141042 = Migration20241022141042;
