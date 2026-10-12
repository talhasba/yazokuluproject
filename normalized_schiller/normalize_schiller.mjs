// Rebuild Schiller's four academic choices from the supplied 2027 announcement.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=(p)=>JSON.parse(readFileSync(join(root,p),'utf8'));
const write=(p,v)=>writeFileSync(join(root,p),JSON.stringify(v,null,2)+'\n');
const source=read('normalized_schiller/programs.reviewed.json');
const common=source.common;
const provider='schiller';
const providerLabel='Schiller International University';
const records=source.programs.map(p=>{
  const location=`${p.city} Campus`;
  const locationTr=`${p.city} Kampüsü`;
  const discounted=common.standard_fee_eur-common.early_booking_discount_eur;
  return {
    id:`schiller-${p.slug}`,provider,provider_label:providerLabel,program_type:'summer_school',
    title:p.title,raw_title:p.title,title_tr:p.title_tr,subject:p.subject,subject_tr:p.subject_tr,categories:p.en.tags,
    location,location_tr:locationTr,location_type:'campus',location_id:`schiller-${p.city.toLowerCase()}`,location_name:location,
    city:p.city,country:p.country,age_ranges:[common.ages],duration:common.duration,delivery_modes:['in_person'],
    language_requirement:common.language_requirement,language_requirement_tr:'İngilizce sınavı veya mülakat ile değerlendirilen en az B1 İngilizce',
    price:{currency:'EUR',min_amount:discounted,max_amount:common.standard_fee_eur,display:`€${discounted.toLocaleString('en-GB')}–€${common.standard_fee_eur.toLocaleString('en-GB')}`,
      tiers:[
        {label:'Residential · 2 weeks · Standard',title:{en:'Standard · 2 weeks',tr:'Standart · 2 hafta'},amount:common.standard_fee_eur,currency:'EUR',display:`€${common.standard_fee_eur.toLocaleString('en-GB')}`},
        {label:'Residential · 2 weeks · Early booking',title:{en:'Early booking · 2 weeks',tr:'Erken kayıt · 2 hafta'},amount:discounted,currency:'EUR',display:`€${discounted.toLocaleString('en-GB')}`,amount_basis:'calculated_from_announced_discount',
          note:{en:'Register by 1 April 2027. €3,350 is calculated from the €3,500 fee less the announced €150 discount.',tr:"1 Nisan 2027'ye kadar kayıt yaptırın. €3.350, €3.500 ücretinden duyurulan €150 indirim düşülerek hesaplanmıştır."}}
      ]},
    price_status:'announced',price_year:2027,dates_year:2027,dates:p.dates,date_months:['July'],
    early_booking:{discount_amount:common.early_booking_discount_eur,currency:'EUR',deadline:common.early_booking_deadline},application_deadline:common.application_deadline,
    description_short:p.en.focus,description_short_tr:p.tr.focus,
    description_full:[p.en.focus,...p.en.do.map(([a,b])=>`${a}: ${b}`)].join('\n\n'),
    description_full_tr:[p.tr.focus,...p.tr.do.map(([a,b])=>`${a}: ${b}`)].join('\n\n'),
    curriculum_sections:p.en.do.map(([title,body])=>({title,body})),curriculum_sections_tr:p.tr.do.map(([title,body])=>({title,body})),
    learning_outcomes:p.en.outcomes,learning_outcomes_tr:p.tr.outcomes,
    image_url:'',detail_url:p.source_url,source_url:p.source_url,source_files:[source._meta.source_file],source_pages:source._meta.source_pages,source_reviewed:source._meta.reviewed,
    flags:['2027 dates, fees and subject choices follow the supplied provider announcement. Confirm availability before booking.','The two detailed flyers referenced by the announcement were not supplied as separate files.',...(p.city==='Madrid'?['The public Madrid page retains provisional dates, 2026 deadlines and a different selection/meal/excursion description; the 2027 announcement is used instead.']:[])],
    publish_status:'needs_review'
  };
});
if(records.length!==4||new Set(records.map(p=>p.id)).size!==4)throw Error('Invalid Schiller records');
const retained=read('data/programs.normalized.json').filter(p=>p.provider!==provider);
if(retained.some(p=>records.some(r=>r.id===p.id)))throw Error('Programme ID collision');
write('normalized_schiller/programs.normalized.json',records);
write('data/programs.normalized.json',[...retained,...records]);
mkdirSync(join(root,'data/digest-src/schiller'),{recursive:true});
write('data/digest-src/schiller/programs.json',Object.fromEntries(source.programs.map(p=>[p.slug,{
  ...Object.fromEntries(['en','tr'].map(lang=>[lang,{...p[lang],hl:lang==='en'?['Two-week programme for ages 15–18','Minimum B1 English; test or interview',p.excursion.en]:['15–18 yaş için iki haftalık program','En az B1 İngilizce; sınav veya mülakat',p.excursion.tr],fit:common[lang].fit,extras:[...common[lang].extras,p.excursion[lang]]}])),flags:records.find(r=>r.id===`schiller-${p.slug}`).flags
}])));
const inclusions=read('data/price-inclusions.json');
inclusions.providers.schiller={sources:[`${source._meta.source_file} (pp. 1–2)`],
  explanation:{en:'Both fees cover the same two-week residential programme. Registering by 1 April 2027 qualifies for the announced €150 early-booking discount; it does not change the course or accommodation.',tr:"Her iki ücret aynı iki haftalık konaklamalı programı kapsar. 1 Nisan 2027'ye kadar kayıt yaptırmak, duyurulan €150 erken kayıt indirimini sağlar; eğitim veya konaklama kapsamı değişmez."},
  residential:{en:common.en.includes,tr:common.tr.includes},excluded:{en:common.en.excludes,tr:common.tr.excludes},
  note:{en:'Application deadline: 1 May 2027. The €3,350 early fee is calculated from €3,500 minus €150; confirm the discount and availability when booking.',tr:'Son başvuru: 1 Mayıs 2027. Erken kayıt ücreti €3.500 eksi €150 olarak hesaplanmıştır; kayıt sırasında indirim ve kontenjan teyit edilmelidir.'}
};
for(const p of source.programs)inclusions.programs[`schiller-${p.slug}`]={residential:{en:[...common.en.includes.slice(0,-1),p.excursion.en,'Official participation certificate'],tr:[...common.tr.includes.slice(0,-1),p.excursion.tr,'Resmî katılım sertifikası']}};
write('data/price-inclusions.json',inclusions);
const images=read('data/image-candidates.json');
for(const record of records)images[record.id]??=[];
write('data/image-candidates.json',images);
console.log(`Merged ${records.length} Schiller programmes; catalogue now contains ${retained.length+records.length} records.`);
