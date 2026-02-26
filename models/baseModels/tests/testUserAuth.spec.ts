import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';
import { getAllPermissionCodes, PERMISSIONS } from 'src/utils/permissions';
import {
  ensureDefaultAdminExists,
  login,
  getCurrentUser,
  logout,
  hasPermission,
} from 'src/utils/authService';
import {
  createUser,
  listUsers,
} from 'src/utils/userService';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

test('UserAuth: default admin is created once', async (t) => {
  const countBefore = await fyo.db.count(ModelNameEnum.User, {});
  t.equal(countBefore, 0, 'no users before ensureDefaultAdminExists in fresh DB');

  await ensureDefaultAdminExists();
  const countAfter = await fyo.db.count(ModelNameEnum.User, {});
  t.equal(countAfter, 1, 'one user created');

  const again = await ensureDefaultAdminExists();
  t.equal(again, undefined, 'second call is a no-op');
  const countFinal = await fyo.db.count(ModelNameEnum.User, {});
  t.equal(countFinal, 1, 'still a single user');
});

test('UserAuth: admin can login and has all permissions', async (t) => {
  await ensureDefaultAdminExists();
  const user = await login('admin', 'admin123');

  t.equal(user.username, 'admin', 'logged in as admin');
  t.equal(user.role, 'admin', 'role is admin');

  const current = getCurrentUser();
  t.ok(current, 'currentUser is set');
  t.equal(current?.username, 'admin', 'currentUser.username is admin');

  const all = getAllPermissionCodes();
  t.ok(all.length > 0, 'there are defined permissions');
  for (const code of all) {
    t.ok(hasPermission(code), `admin has permission ${code}`);
  }

  logout();
  t.equal(getCurrentUser(), null, 'currentUser cleared after logout');
});

test('UserAuth: non-admin user cannot manage users without USERS_MANAGE', async (t) => {
  await ensureDefaultAdminExists();
  await login('admin', 'admin123');

  const basicUser = await createUser({
    username: 'normal',
    fullName: 'Normal User',
    role: 'user',
    isActive: true,
    password: 'secret123',
    permissions: [], // no permissions
  });
  t.equal(basicUser.username, 'normal', 'basic user created by admin');

  logout();
  await login('normal', 'secret123');

  // userService.listUsers requires USERS_MANAGE; it should throw
  try {
    await listUsers();
    t.fail('listUsers should throw for user without USERS_MANAGE');
  } catch (err) {
    t.pass('listUsers throws without USERS_MANAGE');
  }

  // sanity: USERS_MANAGE is one of permissions
  t.ok(PERMISSIONS.USERS_MANAGE, 'USERS_MANAGE permission constant exists');
});

closeTestFyo(fyo, __filename);

