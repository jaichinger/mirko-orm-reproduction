import { Collection, Entity, ManyToOne, MikroORM, OneToMany, PrimaryKey, PrimaryKeyProp, Property, ref, Ref } from '@mikro-orm/sqlite';

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
  [PrimaryKeyProp]?: ['org', 'id'];

  @ManyToOne({
    primary: true,
    entity: () => Organisation,
    nullable: false,
    fieldName: 'org_id',
    deleteRule: 'cascade',
    ref: true,
  })
  org!: Ref<Organisation>;

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

  await orm.schema.refreshDatabase();

  const org = orm.em.create(Organisation, { id: 1, name: 'Test Org' });
  orm.em.create(User, {
    org: org,
    id: 1,
    name: 'John Doe',
  });
  await orm.em.flush();
});

afterAll(async () => {
  await orm.close(true);
});

test('Insert with relationship as ref() (fails)', async () => {
  await orm.em.flush();
  
  const formInsert = orm.em.createQueryBuilder(Form).insert({
    org: ref(Organisation, 1),
    id: 1,
    name: 'Test Form',
    owner: ref(User, [1, 1]),
  });

  await formInsert.execute();
});

test('Insert with relationship as entity (fails)', async () => {
  const user = await orm.em.findOneOrFail(User, [1, 1]);

  const formInsert = orm.em.createQueryBuilder(Form).insert({
    org: ref(Organisation, 1),
    id: 2,
    name: 'Test Form',
    owner: user,
  });

  await formInsert.execute();
});

test('Insert with relationship as PK array (works)', async () => {
  const formInsert = orm.em.createQueryBuilder(Form).insert({
    org: ref(Organisation, 1),
    id: 3,
    name: 'Test Form',
    owner: [1, 1],
  });
  await formInsert.execute();
});