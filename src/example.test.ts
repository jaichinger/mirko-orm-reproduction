import { Entity, ManyToOne, MikroORM, Property, Ref } from '@mikro-orm/sqlite';

@Entity({ abstract: true })
abstract class Common {
  @Property({
    primary: true,
    type: 'integer',
  })
  orgId!: number;

  @Property({
    primary: true,
    type: 'integer',
  })
  id!: number;
}

@Entity()
class Form extends Common {
  @Property({ nullable: false })
  name!: string;
}

@Entity()
class FormSubmission extends Common {
  @ManyToOne({
    entity: () => Form,
    ref: true,
    nullable: true,
  })
  form?: Ref<Form>;
}

@Entity()
class FormSubmissionField extends Common {
  @ManyToOne({
    entity: () => FormSubmission,
    ref: true,
    nullable: false,
  })
  submission!: Ref<FormSubmission>;

  @Property({ nullable: false })
  value!: string;
}


let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [Form, FormSubmission, FormSubmissionField],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
  await orm.em.flush();
});

beforeEach(async () => {
  await orm.schema.refreshDatabase();

  orm.em.clear();

  const form1 = orm.em.create(Form, {
    orgId: 1,
    id: 10,
    name: 'Form 1'
  });

  const submission = orm.em.create(FormSubmission, {
    orgId: 1,
    id: 20,
    form: form1,
  });

  const submissionField = orm.em.create(FormSubmissionField, {
    orgId: 1,
    id: 30,
    submission: submission,
    value: 'James'
  });

  await orm.em.flush();
})

afterAll(async () => {
  await orm.close(true);
});

test('Query through nested relationship', async () => {
  const submissionField = await orm.em.findOneOrFail(
    FormSubmissionField,
    { id: 30 },
    { populate: ['submission.form'] }
  );

  expect(submissionField.submission.$.form?.$.name).toBe('Form 1');
  orm.em.clear();

  const submissionFields = await orm.em.find(
    FormSubmissionField,
    {
      submission: {
        form: {
          orgId: 1,
          id: 10,
        }
      }
    },
  );

  expect(submissionFields).toHaveLength;
});

test('Setting relationship to null should clear both fields of composite foreign key', async () => {
  const submission = await orm.em.findOneOrFail(
    FormSubmission,
    { orgId: 1, id: 20 },
    { populate: ['form'] }
  );

  expect(submission.form).not.toBeNull();

  submission.form = undefined;

  await orm.em.flush()
  orm.em.clear();

  const submissionAfter = await orm.em.findOneOrFail(
    FormSubmission,
    { orgId: 1, id: 20 },
    { populate: ['form'] }
  );

  expect(submissionAfter.form).toBeNull();

  const qb = orm.em.createQueryBuilder(FormSubmission)
    .where({ orgId: 1, id: 20 });

  const results = await qb.execute();
  const result = results[0];

  expect(result.form_org_id).toBeNull();
  expect(result.form_id).toBeNull();
});
