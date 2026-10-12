import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {priceDetails,renderPriceDetails} from '../program-pricing.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const all=read('../data/programs.normalized.json');
const records=all.filter(p=>p.provider==='schiller');
const digests=read('../data/program-digests.json');
const inclusions=read('../data/price-inclusions.json');
const photos=read('../data/program-image-sources.json');

test('Schiller has four separate subjects in the correct 2027 destinations',()=>{
  assert.equal(records.length,4);
  assert.equal(new Set(all.map(p=>p.id)).size,all.length);
  for(const p of records){
    assert.equal(p.provider_label,'Schiller International University');
    assert.equal(p.price_year,2027); assert.equal(p.dates_year,2027);
    assert.equal(p.price_status,'announced'); assert.equal(p.publish_status,'needs_review');
    assert.deepEqual(p.age_ranges,['15-18']); assert.equal(p.duration,'2 weeks');
    assert.match(p.language_requirement,/B1.*test or interview/);
    assert.equal(p.application_deadline,'2027-05-01');
    assert.equal(p.early_booking.deadline,'2027-04-01');
    assert(p.source_files.every(path=>existsSync(new URL(`../${path}`,import.meta.url))));
    if(p.city==='Madrid'){
      assert.equal(p.country,'Spain'); assert.deepEqual(p.dates,['2027-07-04/2027-07-17']);
      assert.match(p.subject,/Law|Business/);
    }else{
      assert.equal(p.city,'Heidelberg'); assert.equal(p.country,'Germany');
      assert.deepEqual(p.dates,['2027-07-18/2027-07-31']); assert.match(p.subject,/Comput/);
    }
    for(const lang of ['en','tr']){
      const d=digests[p.id][lang];
      assert(d.focus && d.do.length>=3 && d.fit.length>=3 && d.outcomes.length);
      assert(d.extras.some(x=>/B1|1 May|1 Mayıs/.test(x)));
      assert(d.fit.some(x=>/B1/.test(x)));
    }
    assert(p.title_tr && p.subject_tr && p.location_tr && p.description_short_tr);
    assert(photos.images[p.id]);
  }
});

test('Schiller early booking is a conditional discount for the same package',()=>{
  for(const p of records){
    assert.deepEqual(p.price.tiers.map(t=>t.amount),[3500,3350]);
    assert.equal(p.price.tiers[1].amount, p.price.tiers[0].amount-p.early_booking.discount_amount);
    assert.equal(p.price.tiers[1].amount_basis,'calculated_from_announced_discount');
    for(const lang of ['en','tr']){
      const model=priceDetails(p,lang,inclusions);
      assert.equal(model.options.length,2); assert.equal(model.historical,false);
      assert.deepEqual(model.options[0].includes,model.options[1].includes);
      assert.notEqual(model.options[0].title,model.options[1].title);
      assert.match(model.options[1].title,/Early booking|Erken kayıt/);
      assert.match(model.options[1].note,/1 April 2027|1 Nisan 2027/);
      assert.match(model.explanation,/150/);
      assert(model.options.every(o=>o.includes.some(x=>/five dinners|beş akşam/.test(x))));
      assert(model.options.every(o=>o.includes.some(x=>/Return airport|Gidiş-dönüş/.test(x))));
      assert(model.commonExcludes.some(x=>/health insurance|sağlık sigortası/.test(x)));
      assert(model.commonExcludes.some(x=>/Dinners other|dışındaki akşam/.test(x)));
      const excursion=p.city==='Madrid'?/Toledo/:/Black Forest/;
      assert(model.options.every(o=>o.includes.some(x=>excursion.test(x))));
      const html=renderPriceDetails(p,lang,inclusions);
      assert(html.section.includes('€3,350') && html.section.includes('€3,500'));
      assert(!/full board|tam pansiyon|2026|Valencia/.test(html.section));
    }
  }
});

test('Schiller public content does not expose private email contacts or attachment links',()=>{
  const text=JSON.stringify(records.map(p=>({description:p.description_full,description_tr:p.description_full_tr,source:p.source_url})))+JSON.stringify(records.map(p=>digests[p.id]));
  assert(!/@asba\.com\.tr|@geduservices\.com|mail\.google\.com|attid=/.test(text));
});
