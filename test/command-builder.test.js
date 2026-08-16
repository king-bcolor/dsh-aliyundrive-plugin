import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSafePath, buildAliyunpanArgs } from '../src/command-builder.js'

test('assertSafePath rejects shell metacharacters and flag-like paths', () => {
  assert.throws(() => assertSafePath('/a|b'), /path/)
  assert.throws(() => assertSafePath('/a;b'), /path/)
  assert.throws(() => assertSafePath('/a&b'), /path/)
  assert.throws(() => assertSafePath('/a\nb'), /path/)
  assert.throws(() => assertSafePath('-rf'), /path/)
  assert.doesNotThrow(() => assertSafePath('/我的资源/1.mp4'))
  assert.doesNotThrow(() => assertSafePath('C:/Users/Administrator/Desktop/1.mp4'))
})

test('buildAliyunpanArgs maps simple commands', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_who', {}), ['who'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_loglist', {}), ['loglist'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_quota', {}), ['quota'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_pwd', {}), ['pwd'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_login', {}), ['login'])
})

test('buildAliyunpanArgs maps drive and cd', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_drive', { driveId: 'backup' }), ['drive', 'backup'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_cd', { path: '/我的资源', driveId: 'backup' }), ['cd', '--driveId', 'backup', '/我的资源'])
})

test('buildAliyunpanArgs maps ls with flags before path', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_ls', { path: '/books', driveId: 'backup', detail: true, order: 'asc', sort: 'size' }), [
    'll', '--driveId', 'backup', '--asc', '--size', '/books',
  ])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_ls', {}), ['ls'])
})

test('buildAliyunpanArgs maps mkdir rename mv cp', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_mkdir', { path: '/new', driveId: 'backup' }), ['mkdir', '--driveId', 'backup', '/new'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_rename', { path: '/a.mp4', newName: 'b.mp4' }), ['rename', '/a.mp4', 'b.mp4'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_mv', { paths: ['/a', '/b'], destination: '/dst' }), ['mv', '/a', '/b', '/dst'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_cp', { paths: ['/a'], destination: '/dst', driveId: 'backup' }), ['cp', '--driveId', 'backup', '/a', '/dst'])
})

test('buildAliyunpanArgs maps rm and recycle-style commands', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_rm', { paths: ['/a', '/b'], driveId: 'backup' }), ['rm', '--driveId', 'backup', '/a', '/b'])
})

test('buildAliyunpanArgs maps upload with flags first and remotePath last', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_upload', {
    localPaths: ['/local/a', '/local/b'],
    remotePath: '/remote',
    driveId: 'backup',
    exn: ['\\.jpg$', '^@eadir$'],
    ui: true,
    ow: true,
    parallel: 4,
    retry: 5,
  }), [
    'upload', '--driveId', 'backup', '--exn', '\\.jpg$', '--exn', '^@eadir$', '--ui', '--ow', '-p', '4', '--retry', '5',
    '/local/a', '/local/b', '/remote',
  ])
})

test('buildAliyunpanArgs maps download with flags before remote paths', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_download', {
    remotePaths: ['/remote/a'],
    saveTo: '/save',
    ow: true,
    retry: 5,
    check: false,
    parallel: 2,
    exn: ['\\.jpg$'],
    driveId: 'backup',
  }), [
    'download', '--driveId', 'backup', '--saveto', '/save', '--ow', '--retry', '5', '--nocheck', '-p', '2', '--exn', '\\.jpg$',
    '/remote/a',
  ])
})

test('buildAliyunpanArgs maps share and album', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_share_set', { paths: ['/a'], mode: '1', time: '1', sharePwd: '2333' }), [
    'share', 'set', '--time', '1', '--mode', '1', '--sharePwd', '2333', '/a',
  ])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_album_list', {}), ['album', 'list'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_album_show', { albumId: '我的相簿' }), ['album', 'list-file', '我的相簿'])
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_album_download', { albumId: '我的相簿', saveTo: '/save', ow: true }), [
    'album', 'download-file', '--ow', '--saveto', '/save', '我的相簿',
  ])
})

test('buildAliyunpanArgs maps sync start', () => {
  assert.deepEqual(buildAliyunpanArgs('aliyunpan_sync_start', {
    ldir: '/local/docs',
    pdir: '/sync_drive/docs',
    mode: 'upload',
    policy: 'increment',
    drive: 'backup',
    dp: 2,
    up: 1,
  }), [
    'sync', 'start', '--drive', 'backup', '--ldir', '/local/docs', '--pdir', '/sync_drive/docs',
    '--mode', 'upload', '--policy', 'increment', '--dp', '2', '--up', '1',
  ])
})

test('buildAliyunpanArgs rejects unknown tool names', () => {
  assert.throws(() => buildAliyunpanArgs('aliyunpan_does_not_exist', {}), /Unknown tool/)
})

test('buildAliyunpanArgs validates enum-like flags before spawning', () => {
  assert.throws(() => buildAliyunpanArgs('aliyunpan_ls', { order: 'sideways' }), /order/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_ls', { sort: 'color' }), /sort/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_sync_start', { ldir: '/l', pdir: '/p', mode: 'sideways' }), /mode/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_sync_start', { ldir: '/l', pdir: '/p', policy: 'merge' }), /policy/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_sync_start', { ldir: '/l', pdir: '/p', drive: 'other' }), /drive/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_sync_start', { ldir: '/l', pdir: '/p', cycle: 'weekly' }), /cycle/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_share_set', { paths: ['/a'], mode: '4' }), /mode/)
  assert.throws(() => buildAliyunpanArgs('aliyunpan_share_set', { paths: ['/a'], time: '9' }), /time/)
})

test('buildAliyunpanArgs rejects malformed exclude patterns', () => {
  assert.throws(() => buildAliyunpanArgs('aliyunpan_upload', {
    localPaths: ['/local/a'], remotePath: '/remote', exn: ['bad\npattern'],
  }), /exclude pattern/)
})
