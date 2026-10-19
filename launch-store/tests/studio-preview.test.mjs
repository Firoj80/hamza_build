import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderStudioPreview,previewSteps} from '../lib/studio-preview.mjs';

test('public Studio samples cannot edit, execute the paid app or access saved data',()=>{
 for(let i=0;i<previewSteps.length;i++){
  const html=renderStudioPreview('',String(i));
  assert(html.includes(previewSteps[i]));
  assert(!/<script\b|<form\b|fetch\(|localStorage|PLATFORM_INITIAL_STATE|platform_workspace|CATALOG/.test(html));
  const controls=html.match(/<(?:input|textarea|select|button)\b[^>]*>/g)||[];
  assert(controls.length>0);assert(controls.every(tag=>/\bdisabled\b/.test(tag)));
 }
});
test('preview step input cannot inject HTML or expose additional workspace content',()=>{
 const normal=renderStudioPreview('',0);
 for(const input of ['<script>alert(1)</script>','-1','5','Infinity'])assert.equal(renderStudioPreview('',input),normal);
});
