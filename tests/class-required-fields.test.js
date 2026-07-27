const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const readSource = relativePath => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
const firstStepSource = readSource('pages/enter-class/createClassForm1.vue');
const secondStepSource = readSource('pages/enter-class/createClassForm2.vue');
const createApiSource = readSource('uniCloud-aliyun/cloudfunctions/wtdb-business-class-create/index.js');
const schemaSource = readSource('uniCloud-aliyun/database/wtdb-business-class-list.schema.json');

test('mini program requires section, grade, and class before leaving step one', () => {
  assert.match(firstStepSource, /!this\.selectedSection \|\| !this\.selectedGrade \|\| !this\.selectedClass/);
  assert.match(firstStepSource, /选择学段 <text class="required-mark">\*<\/text>/);
  assert.match(firstStepSource, /选择年级 <text class="required-mark">\*<\/text>/);
  assert.match(firstStepSource, /选择班级 <text class="required-mark">\*<\/text>/);
});

test('mini program revalidates cached class structure before submission', () => {
  assert.match(secondStepSource, /getRequiredClassStructure\(cacheData/);
  assert.match(secondStepSource, /请先选择学段、年级和班级/);
  assert.doesNotMatch(secondStepSource, /section:\s*cacheData\.section \|\| "小学"/);
});

test('class creation API and schema require the full class structure', () => {
  for (const [field, message] of [
    ['section', '请选择学段'],
    ['grade', '请选择年级'],
    ['className', '请选择班级'],
  ]) {
    assert.match(createApiSource, new RegExp(`if \\(!${field}\\)[^\\n]+${message}`));
  }
  for (const field of ['section', 'grade', 'class']) {
    assert.match(schemaSource, new RegExp(`"required"[\\s\\S]*"${field}"`));
  }
});
