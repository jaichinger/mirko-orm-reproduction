import { Collection, Entity, ManyToOne, MikroORM, OneToMany, Property, Ref } from '@mikro-orm/postgresql';

@Entity()
class Organisation {
  @Property({
    primary: true,
    type: 'integer',
    fieldName: 'org_id'
  })
  id!: number;

  @Property({ nullable: false })
  name!: string;
}

@Entity({ abstract: true })
abstract class Common {
  @ManyToOne({
    primary: true,
    entity: () => Organisation,
    nullable: false,
    deleteRule: 'cascade',
    mapToPk: true,
    fieldName: 'org_id'
  })
  orgId!: number;

  @Property({
    primary: true,
    type: 'integer',
  })
  id!: number;
}

@Entity()
class User extends Common {
  @Property({ nullable: false })
  name!: string;

  @OneToMany({
    entity: () => Form,
    mappedBy: 'owner',
    orphanRemoval: true,
  })
  forms = new Collection<Form>(this);
}

@Entity()
class Form extends Common {
  @Property()
  name!: string;

  @ManyToOne({
    entity: () => User,
    nullable: true,
    ref: true,
  })
  owner?: Ref<User>;
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: 'test',
    host: 'db',
    password: 'password',
    entities: [User, Form],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });

  await orm.schema.dropSchema();
});

afterAll(async () => {
  // await orm.schema.dropSchema();
  await orm.close(true);
});

test('There should be schema changes starting from clean', async () => {
  const generator = orm.getSchemaGenerator();
  const beforeSql = await generator.getUpdateSchemaSQL({
    safe: false,
    dropTables: false,
  });
  expect(beforeSql).toBeTruthy();
  await generator.updateSchema({
    safe: false,
    dropTables: false,
  });
});

test('No changes after schema updated.', async () => {
  const generator = orm.getSchemaGenerator();
  const afterSql = await generator.getUpdateSchemaSQL({
    safe: false,
    dropTables: false,
  });
  expect(afterSql).toBe("");
})