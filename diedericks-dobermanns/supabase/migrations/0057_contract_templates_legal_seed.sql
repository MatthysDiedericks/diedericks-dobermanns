-- 0057_contract_templates_legal_seed.sql
-- Seeds Puppy Sale Agreement + Elite Developed Addendum (verbatim from LEGAL/).
-- Schema (programme_tier, is_addendum, version, contract_clauses, …) is already live.
--
-- APPLY MANUALLY — Cursor cannot reach Supabase.
-- Regenerate: node scripts/build-contract-templates-migration.mjs

BEGIN;

DO $$
DECLARE
  v_main uuid;
  v_add uuid;
BEGIN
  SELECT id INTO v_main FROM contract_templates WHERE description = 'key:puppy_sale_agreement' LIMIT 1;
  IF v_main IS NULL THEN
    INSERT INTO contract_templates (
      name, contract_title, description, body_html, is_active, sort_order,
      programme_tier, is_addendum, version
    ) VALUES (
      'Puppy Sale and Placement Agreement',
      'Puppy Sale and Placement Agreement',
      'key:puppy_sale_agreement',
      $main$<h1>PUPPY SALE AND PLACEMENT AGREEMENT</h1>
<p><strong>Diedericks Dobermanns</strong> <em>Born With Purpose. Built With Discipline.</em></p>
<p><strong>Agreement {{contract_number}}</strong> · Quote {{quote_number}} · Invoice {{invoice_number}}</p>
<hr />
<h2>PARTIES</h2>
<p><strong>THE BREEDER</strong> Matthys Diedericks t/a Diedericks Dobermanns 302 Usutu Drive, H115 Mhlambanyatsi, Eswatini {{breeder_email}} · {{breeder_phone}} (<em>"the Breeder", "we", "us"</em>)</p>
<p><strong>THE BUYER</strong> {{buyer_full_name}} · ID/Passport {{buyer_id_number}} {{buyer_address}} {{buyer_email}} · {{buyer_phone}} (<em>"the Buyer", "you"</em>)</p>
<h2>THE DOG</h2>
<table>
<thead><tr><th></th><th></th></tr></thead>
<tbody>
<tr><td>Name</td><td>{{dog_name}}</td></tr>
<tr><td>Sex</td><td>{{dog_sex}}</td></tr>
<tr><td>Colour</td><td>{{dog_colour}}</td></tr>
<tr><td>Date of birth</td><td>{{dog_dob}}</td></tr>
<tr><td>Microchip</td><td>{{dog_microchip}}</td></tr>
<tr><td>Registration</td><td>{{dog_registration}}</td></tr>
<tr><td>Sire</td><td>{{sire_name}}</td></tr>
<tr><td>Dam</td><td>{{dam_name}}</td></tr>
<tr><td>Litter</td><td>{{litter_name}}</td></tr>
<tr><td>Purchase price</td><td>{{purchase_price}}</td></tr>
<tr><td>Amount received</td><td>{{amount_paid}} on {{payment_date}}</td></tr>
<tr><td>Programme tier</td><td>{{programme_tier}}</td></tr>
<tr><td>Reference</td><td>{{quote_number}}</td></tr>
</tbody></table>
<hr />
<h2>PREAMBLE</h2>
<p><strong>We care what happens to this dog for the whole of its life.</strong></p>
<p>The Breeder has invested years in the selection, health testing and development of the bloodlines from which this dog comes. The Breeder places dogs; the Breeder does not merely sell them. Our interest in this dog does not end when it leaves us, and it does not end when the money clears.</p>
<p>The terms that follow are firm, and some of them are unusual. They exist for one reason: so that no dog we have bred is ever neglected, passed from home to home, or surrendered to a shelter. If you ever cannot keep this dog — for any reason, without judgement and without cost to you — it comes home to us. That undertaking runs for the dog's lifetime and it runs both ways.</p>
<p>This Agreement records the terms on which the dog named above passes into your care, and the standard of care we ask in return. It takes effect on receipt of payment and continues for the lifetime of the dog.</p>
<p class="contract-ack" data-clause-ref="preamble" data-required="true">I understand that the Breeder retains a lifelong interest in this dog's welfare, and will always take the dog back.</p>
<hr />
<h2>1. SALE AND TRANSFER OF OWNERSHIP</h2>
<p>1.1 The Breeder sells and the Buyer purchases the dog described above for the purchase price stated, receipt of which the Breeder acknowledges.</p>
<p>1.2 Ownership passes to the Buyer on physical delivery of the dog, subject to every condition in this Agreement. The conditions in clauses 5 to 9 survive transfer and run for the lifetime of the dog.</p>
<p>1.3 Risk in the dog passes to the Buyer on delivery.</p>
<p class="contract-ack" data-clause-ref="1" data-required="true">I understand that ownership is conditional and that conditions continue for the dog's lifetime.</p>
<h2>2. HEALTH AT HANDOVER</h2>
<p>2.1 The dog is delivered having received age-appropriate vaccination, deworming and a veterinary examination. Records are provided with the dog and are available in the Buyer's client portal.</p>
<p>2.2 The Buyer is advised to have the dog examined by a veterinarian of the Buyer's own choosing <strong>within seventy-two (72) hours</strong> of delivery. Where such an examination discloses a pre-existing congenital defect materially affecting the dog's health, the Buyer must notify the Breeder in writing within seven (7) days, supported by the veterinarian's written findings.</p>
<p>2.3 The Breeder's obligations in respect of such a defect are set out in clause 3. This clause does not limit any right the Buyer has under the Consumer Protection Act 68 of 2008.</p>
<p class="contract-ack" data-clause-ref="2" data-required="true">I understand the 72-hour examination and 7-day notification periods.</p>
<h2>3. HEALTH UNDERTAKING</h2>
<p>3.1 The Breeder health-tests breeding stock for dilated cardiomyopathy (DCM1–DCM5), hip dysplasia and elbow dysplasia. Results for this dog's sire and dam are available to the Buyer.</p>
<p>3.2 Where a veterinary specialist confirms a <strong>hereditary</strong> defect that materially affects the dog's quality of life and which manifests before the dog's second birthday, and the Buyer has complied with clause 2.2 and clause 4, the Breeder will at the Breeder's election either replace the dog from a future litter or refund a portion of the purchase price to be agreed.</p>
<p>3.3 The Breeder does not undertake in respect of: conditions arising from injury, neglect, inadequate nutrition, over-exercise during growth, obesity, failure to vaccinate, failure to treat parasites, or any condition caused or aggravated by the Buyer's own conduct.</p>
<p>3.4 Nothing in this clause limits the Buyer's rights under sections 55 and 56 of the Consumer Protection Act 68 of 2008.</p>
<p class="contract-ack" data-clause-ref="3" data-required="true">I understand what is and is not covered by the health undertaking.</p>
<h2>4. THE BUYER'S OBLIGATIONS OF CARE</h2>
<p>The Buyer undertakes, for the lifetime of the dog, to:</p>
<p>4.1 provide adequate, appropriate and sufficient food and clean water at all times;</p>
<p>4.2 provide <strong>shelter that is dry, warm and secure</strong>. The Buyer acknowledges that the Dobermann is a short-coated breed with limited tolerance for cold and is not suited to being permanently housed outdoors without adequate warm shelter;</p>
<p>4.3 keep the dog within a securely fenced property and under proper control in public;</p>
<p>4.4 provide veterinary care when required, and maintain vaccination and parasite control;</p>
<p>4.5 provide daily exercise, mental stimulation and human company appropriate to the breed, and <strong>not</strong> keep the dog in prolonged isolation, permanently chained, or permanently confined to a cage, run or kennel;</p>
<p>4.6 maintain the dog's microchip registration with the Buyer's current contact details;</p>
<p>4.7 notify the Breeder in writing within fourteen (14) days of any change of the Buyer's address, telephone number or email address; and</p>
<p>4.8 never surrender, sell, give away, abandon, rehome or dispose of the dog other than in accordance with clause 6, and never surrender the dog to a shelter, pound, rescue organisation, laboratory, pet shop, dealer or any similar institution.</p>
<p class="contract-ack" data-clause-ref="4_care" data-required="true">I accept these obligations of care for the dog's lifetime.</p>
<p class="contract-ack" data-clause-ref="4_shelter" data-required="true">I understand this breed requires warm, dry shelter and human company, and I will provide both.</p>
<h2>5. WELFARE INSPECTION</h2>
<p>5.1 The Buyer <strong>consents</strong> to the Breeder, or a person nominated by the Breeder in writing, inspecting the dog and the premises at which it is kept, in order to satisfy the Breeder that the obligations in clause 4 are being met.</p>
<p>5.2 Such an inspection will be arranged on reasonable prior notice of not less than forty-eight (48) hours, at a reasonable time, and will not be conducted more than twice in any twelve-month period unless the Breeder has reasonable cause for concern.</p>
<p>5.3 Where an in-person inspection is impractical by reason of distance, the Buyer will on request provide clear, current photographs or video of the dog and its living conditions within seven (7) days.</p>
<p>5.4 <strong>Unreasonable refusal</strong> to permit an inspection under this clause, or failure to provide photographs under clause 5.3, is a material breach of this Agreement and entitles the Breeder to exercise the rights in clause 7.</p>
<p class="contract-ack" data-clause-ref="5" data-required="true">I consent to welfare inspection on notice, and to providing photographs where distance makes a visit impractical.</p>
<h2>6. NO TRANSFER — RETURN TO THE BREEDER</h2>
<p>6.1 <strong>This dog is not transferable.</strong> The Buyer may not sell, give, lend, lease, gift, bequeath or otherwise part with possession of the dog to any other person.</p>
<p>6.2 If at any time and for any reason the Buyer is unable or unwilling to keep the dog, the Buyer <strong>must</strong> notify the Breeder in writing and <strong>return the dog to the Breeder</strong>.</p>
<p>6.3 The Breeder may, on written application and entirely at the Breeder's discretion, approve a transfer to a named alternative home. Any such approval must be <strong>in writing</strong> and given <strong>before</strong> the dog leaves the Buyer's possession. Verbal approval is of no force or effect.</p>
<p>6.4 Where the dog is returned under clause 6.2, or is removed under clause 7, <strong>full ownership of the dog reverts to the Breeder</strong> on the dog coming into the Breeder's possession, and the Buyer will sign any document reasonably required to record that reversion.</p>
<p>6.5 The Buyer acknowledges that the purpose of this clause is to ensure that no dog bred by the Breeder is abandoned, passed between homes, or surrendered to a shelter, and that the Breeder accepts a lifetime obligation to take back any dog it has bred.</p>
<p class="contract-ack" data-clause-ref="6_transfer" data-required="true">I understand the dog may never be sold, given away or rehomed by me.</p>
<p class="contract-ack" data-clause-ref="6_return" data-required="true">I understand that if I cannot keep the dog, I must return it to the Breeder, and that ownership then reverts to the Breeder.</p>
<h2>7. RECALL AND REMOVAL</h2>
<p>7.1 The Breeder may recall and remove the dog where, on reasonable grounds, the Breeder determines that:</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.1 the dog is not receiving adequate food, water, shelter or veterinary care;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.2 the dog is being neglected, ill-treated, or kept in conditions that endanger its physical or mental wellbeing;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.3 the Buyer is no longer able to provide for the dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.4 the dog has been transferred, rehomed or disposed of in breach of clause 6;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.5 the dog has been bred in breach of clause 8; or</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.6 the Buyer has refused inspection in breach of clause 5.</p>
<p>7.2 Before exercising this right, other than where the dog is in immediate danger, the Breeder will give the Buyer <strong>written notice</strong> specifying the failure and allowing <strong>fourteen (14) days</strong> to remedy it, where it is capable of remedy.</p>
<p>7.3 <strong>Removal is carried out at the Breeder's own cost.</strong> The Buyer will not be charged for collection or transport.</p>
<p>7.4 <strong>Where the dog is removed by reason of the Buyer's breach of this Agreement, no part of the purchase price is refundable</strong>, and the Buyer will have no claim against the Breeder in respect of the purchase price, the dog, or any cost the Buyer has incurred in respect of the dog.</p>
<p>7.5 The Buyer will make the dog available on removal, together with its registration papers, veterinary records and microchip documentation.</p>
<p>7.6 Nothing in this clause limits any right or remedy the Breeder or any competent authority has under the Animals Protection Act 71 of 1962 or equivalent legislation.</p>
<p class="contract-ack" data-clause-ref="7_recall" data-required="true">I understand the Breeder may recall and remove the dog on the grounds listed, after written notice and an opportunity to remedy.</p>
<p class="contract-ack" data-clause-ref="7_refund" data-required="true">I understand that if the dog is removed because I breached this Agreement, I will not be refunded any part of the purchase price.</p>
<h2>8. NO BREEDING RIGHTS</h2>
<p>8.1 <strong>This dog is sold with no breeding rights whatsoever.</strong> The dog is placed as a companion, family or working dog only.</p>
<p>8.2 The Buyer may not mate, breed from, stud out, or permit the mating of the dog, whether for payment or otherwise, and whether or not a litter results.</p>
<p>8.3 The Buyer may not collect, store, sell or use semen or ova from the dog, and may not permit the dog to be used in any artificial insemination or assisted reproduction.</p>
<p>8.4 The Buyer may not apply for full or breeding registration of the dog with any kennel union or registry, nor register any progeny of the dog.</p>
<p>8.5 The Buyer acknowledges that the Breeder's bloodlines are the product of many years of selection, health testing and expense, and that unauthorised breeding causes the Breeder real and substantial loss — including loss of stud and puppy income, dilution of the line, and damage to the Breeder's reputation where dogs of unverified health status circulate under the Breeder's bloodlines.</p>
<p>8.6 In the event of a breach of this clause, the Buyer will be liable to the Breeder for <strong>a penalty of {{breeding_penalty}} per litter conceived or born in breach</strong>.</p>
<p>8.7 The parties record that this figure is a <strong>genuine pre-estimate of the Breeder's loss</strong>, arrived at as follows: a Dobermann litter from these bloodlines commonly numbers between six and ten puppies; the Breeder's own placement prices for such puppies range from R20 000,00 for a standard puppy to R60 000,00 for an elite developed puppy. The agreed penalty is materially <strong>below</strong> the gross value of a single elite litter, and does not attempt to compensate the Breeder for dilution of the bloodline or for reputational harm caused by dogs of unverified health status circulating under the Breeder's name. The Buyer confirms that this basis was explained and that the figure is accepted as reasonable.</p>
<p>8.8 This penalty is payable in addition to, and not in substitution for, the Breeder's right to recall the dog under clause 7 and to claim any further proven loss.</p>
<p class="contract-ack" data-clause-ref="8_rights" data-required="true">I understand this dog is sold with no breeding rights of any kind.</p>
<p class="contract-ack" data-clause-ref="8_penalty" data-required="true">I understand that if I breed from this dog I will be liable for a penalty per litter, and the dog may be recalled.</p>
<h2>9. NAME, REGISTRATION AND REPRESENTATION</h2>
<p>9.1 The dog's registered kennel name may not be changed. A call name of the Buyer's choosing may be used.</p>
<p>9.2 The Buyer will identify the dog as bred by Diedericks Dobermanns where the dog's breeding is stated, and will not represent the dog as bred by any other person.</p>
<p>9.3 The Buyer will not use the Diedericks Dobermanns name, marks or images commercially without the Breeder's prior written consent.</p>
<p class="contract-ack" data-clause-ref="9" data-required="true">I accept the terms on registered name and representation.</p>
<h2>10. DEATH OR LOSS OF THE DOG</h2>
<p>10.1 The Buyer will notify the Breeder in writing within seven (7) days of the death, theft or straying of the dog.</p>
<p>10.2 Where the dog dies before its fifth birthday, the Breeder may request a copy of the veterinary report or, where a post-mortem is performed, its findings. The Breeder relies on this information to monitor the health of the bloodline. The Buyer is not obliged to incur the cost of a post-mortem.</p>
<p class="contract-ack" data-clause-ref="10" data-required="true">I will notify the Breeder if the dog dies, is stolen or goes missing.</p>
<h2>11. ADDENDA</h2>
<p>11.1 Where the dog is placed under one of the Breeder's development or training programmes, the applicable Addendum below is <strong>attached to and forms part of</strong> this Agreement, and the Buyer acknowledges it separately:</p>
<table>
<thead><tr><th>Programme tier</th><th>Addendum</th></tr></thead>
<tbody>
<tr><td>Standard Puppy</td><td><em>(none)</em></td></tr>
<tr><td>Elite Developed Puppy</td><td><strong>Addendum A — Elite Developed Puppy</strong></td></tr>
<tr><td>Elite Family Protection Dog</td><td><strong>Addendum B — Elite Family Protection Dog</strong></td></tr>
</tbody></table>
<p>11.2 An Addendum applies <strong>in addition to</strong>, and not in substitution for, this Agreement. Where an Addendum and this Agreement conflict, the Addendum prevails <strong>only</strong> on the subject matter it expressly addresses; every other term of this Agreement continues in full force.</p>
<p>11.3 This Agreement is not validly concluded in respect of a dog placed under a programme tier unless the corresponding Addendum has also been acknowledged and accepted by the Buyer.</p>
<p class="contract-ack" data-clause-ref="11" data-required="true">I understand that any Addendum listed above forms part of this Agreement.</p>
<h2>12. GENERAL</h2>
<p>12.1 <strong>Entire agreement.</strong> This document, together with any Addendum attached to it, is the entire agreement between the parties. No variation is of any force unless reduced to writing and signed by both parties.</p>
<p>11.2 <strong>Consumer Protection Act.</strong> Nothing in this Agreement is intended to limit or exclude any right the Buyer has under the Consumer Protection Act 68 of 2008 that cannot lawfully be limited or excluded. Where a provision of this Agreement conflicts with such a right, that right prevails and the remainder of this Agreement continues in force.</p>
<p>11.3 <strong>Severability.</strong> If any provision is found unenforceable, it is severed and the remainder continues in force.</p>
<p>11.4 <strong>Governing law and jurisdiction.</strong> This Agreement is governed by the law of the Republic of South Africa. The parties consent to the jurisdiction of the Magistrates' Court having jurisdiction, notwithstanding that the claim may exceed that court's ordinary monetary jurisdiction.</p>
<p>11.5 <strong>Notices.</strong> Written notice may be given by email to the addresses recorded above, or to any address subsequently notified in writing. Notice by email is deemed received on the day of transmission unless the sender receives a delivery failure.</p>
<p>11.6 <strong>Personal information.</strong> The Breeder processes the Buyer's personal information for the purposes of this Agreement, breed health record-keeping and lifetime aftercare, in accordance with the Protection of Personal Information Act 4 of 2013.</p>
<p>11.7 <strong>Electronic signature.</strong> The parties agree that this Agreement may be concluded electronically, and that an electronic acceptance recorded by the Breeder's system constitutes a valid signature for the purposes of the Electronic Communications and Transactions Act 25 of 2002.</p>
<p class="contract-ack" data-clause-ref="12" data-required="true">I have read and understood clauses 11.1 to 11.7.</p>
<hr />
<h2>ACKNOWLEDGEMENT BY THE BUYER</h2>
<p>I confirm that:</p>
<p class="contract-ack" data-clause-ref="ack_1" data-required="true">I have read this Agreement in full, in a language I understand.</p>
<p class="contract-ack" data-clause-ref="ack_2" data-required="true">The terms that place obligations or restrictions on me — in particular clauses 5, 6, 7 and 8 — were drawn to my attention, and I had the opportunity to ask questions before accepting.</p>
<p class="contract-ack" data-clause-ref="ack_3" data-required="true">I was given the opportunity to obtain independent legal advice.</p>
<p class="contract-ack" data-clause-ref="ack_4" data-required="true">I am purchasing this dog for myself and not as an agent for, or for resale to, another person.</p>
<p class="contract-ack" data-clause-ref="ack_5" data-required="true">The information I supplied in my application is true and complete.</p>
<p class="contract-ack" data-clause-ref="ack_6" data-required="true">I accept this Agreement and intend my electronic acceptance to have the same effect as my signature.</p>
<hr />
<table>
<thead><tr><th></th><th>Breeder</th><th>Buyer</th></tr></thead>
<tbody>
<tr><td>Name</td><td>Matthys Diedericks</td><td>{{buyer_full_name}}</td></tr>
<tr><td>Signature</td><td>{{breeder_signature}}</td><td>{{buyer_signature}}</td></tr>
<tr><td>Date</td><td>{{breeder_signed_at}}</td><td>{{buyer_signed_at}}</td></tr>
</tbody></table>
<p><em>Document {{contract_reference}} · version {{template_version}} · generated {{generated_at}}</em></p>$main$,
      true, 10, NULL, false, 1
    ) RETURNING id INTO v_main;
  ELSE
    UPDATE contract_templates SET
      name = 'Puppy Sale and Placement Agreement',
      contract_title = 'Puppy Sale and Placement Agreement',
      body_html = $main$<h1>PUPPY SALE AND PLACEMENT AGREEMENT</h1>
<p><strong>Diedericks Dobermanns</strong> <em>Born With Purpose. Built With Discipline.</em></p>
<p><strong>Agreement {{contract_number}}</strong> · Quote {{quote_number}} · Invoice {{invoice_number}}</p>
<hr />
<h2>PARTIES</h2>
<p><strong>THE BREEDER</strong> Matthys Diedericks t/a Diedericks Dobermanns 302 Usutu Drive, H115 Mhlambanyatsi, Eswatini {{breeder_email}} · {{breeder_phone}} (<em>"the Breeder", "we", "us"</em>)</p>
<p><strong>THE BUYER</strong> {{buyer_full_name}} · ID/Passport {{buyer_id_number}} {{buyer_address}} {{buyer_email}} · {{buyer_phone}} (<em>"the Buyer", "you"</em>)</p>
<h2>THE DOG</h2>
<table>
<thead><tr><th></th><th></th></tr></thead>
<tbody>
<tr><td>Name</td><td>{{dog_name}}</td></tr>
<tr><td>Sex</td><td>{{dog_sex}}</td></tr>
<tr><td>Colour</td><td>{{dog_colour}}</td></tr>
<tr><td>Date of birth</td><td>{{dog_dob}}</td></tr>
<tr><td>Microchip</td><td>{{dog_microchip}}</td></tr>
<tr><td>Registration</td><td>{{dog_registration}}</td></tr>
<tr><td>Sire</td><td>{{sire_name}}</td></tr>
<tr><td>Dam</td><td>{{dam_name}}</td></tr>
<tr><td>Litter</td><td>{{litter_name}}</td></tr>
<tr><td>Purchase price</td><td>{{purchase_price}}</td></tr>
<tr><td>Amount received</td><td>{{amount_paid}} on {{payment_date}}</td></tr>
<tr><td>Programme tier</td><td>{{programme_tier}}</td></tr>
<tr><td>Reference</td><td>{{quote_number}}</td></tr>
</tbody></table>
<hr />
<h2>PREAMBLE</h2>
<p><strong>We care what happens to this dog for the whole of its life.</strong></p>
<p>The Breeder has invested years in the selection, health testing and development of the bloodlines from which this dog comes. The Breeder places dogs; the Breeder does not merely sell them. Our interest in this dog does not end when it leaves us, and it does not end when the money clears.</p>
<p>The terms that follow are firm, and some of them are unusual. They exist for one reason: so that no dog we have bred is ever neglected, passed from home to home, or surrendered to a shelter. If you ever cannot keep this dog — for any reason, without judgement and without cost to you — it comes home to us. That undertaking runs for the dog's lifetime and it runs both ways.</p>
<p>This Agreement records the terms on which the dog named above passes into your care, and the standard of care we ask in return. It takes effect on receipt of payment and continues for the lifetime of the dog.</p>
<p class="contract-ack" data-clause-ref="preamble" data-required="true">I understand that the Breeder retains a lifelong interest in this dog's welfare, and will always take the dog back.</p>
<hr />
<h2>1. SALE AND TRANSFER OF OWNERSHIP</h2>
<p>1.1 The Breeder sells and the Buyer purchases the dog described above for the purchase price stated, receipt of which the Breeder acknowledges.</p>
<p>1.2 Ownership passes to the Buyer on physical delivery of the dog, subject to every condition in this Agreement. The conditions in clauses 5 to 9 survive transfer and run for the lifetime of the dog.</p>
<p>1.3 Risk in the dog passes to the Buyer on delivery.</p>
<p class="contract-ack" data-clause-ref="1" data-required="true">I understand that ownership is conditional and that conditions continue for the dog's lifetime.</p>
<h2>2. HEALTH AT HANDOVER</h2>
<p>2.1 The dog is delivered having received age-appropriate vaccination, deworming and a veterinary examination. Records are provided with the dog and are available in the Buyer's client portal.</p>
<p>2.2 The Buyer is advised to have the dog examined by a veterinarian of the Buyer's own choosing <strong>within seventy-two (72) hours</strong> of delivery. Where such an examination discloses a pre-existing congenital defect materially affecting the dog's health, the Buyer must notify the Breeder in writing within seven (7) days, supported by the veterinarian's written findings.</p>
<p>2.3 The Breeder's obligations in respect of such a defect are set out in clause 3. This clause does not limit any right the Buyer has under the Consumer Protection Act 68 of 2008.</p>
<p class="contract-ack" data-clause-ref="2" data-required="true">I understand the 72-hour examination and 7-day notification periods.</p>
<h2>3. HEALTH UNDERTAKING</h2>
<p>3.1 The Breeder health-tests breeding stock for dilated cardiomyopathy (DCM1–DCM5), hip dysplasia and elbow dysplasia. Results for this dog's sire and dam are available to the Buyer.</p>
<p>3.2 Where a veterinary specialist confirms a <strong>hereditary</strong> defect that materially affects the dog's quality of life and which manifests before the dog's second birthday, and the Buyer has complied with clause 2.2 and clause 4, the Breeder will at the Breeder's election either replace the dog from a future litter or refund a portion of the purchase price to be agreed.</p>
<p>3.3 The Breeder does not undertake in respect of: conditions arising from injury, neglect, inadequate nutrition, over-exercise during growth, obesity, failure to vaccinate, failure to treat parasites, or any condition caused or aggravated by the Buyer's own conduct.</p>
<p>3.4 Nothing in this clause limits the Buyer's rights under sections 55 and 56 of the Consumer Protection Act 68 of 2008.</p>
<p class="contract-ack" data-clause-ref="3" data-required="true">I understand what is and is not covered by the health undertaking.</p>
<h2>4. THE BUYER'S OBLIGATIONS OF CARE</h2>
<p>The Buyer undertakes, for the lifetime of the dog, to:</p>
<p>4.1 provide adequate, appropriate and sufficient food and clean water at all times;</p>
<p>4.2 provide <strong>shelter that is dry, warm and secure</strong>. The Buyer acknowledges that the Dobermann is a short-coated breed with limited tolerance for cold and is not suited to being permanently housed outdoors without adequate warm shelter;</p>
<p>4.3 keep the dog within a securely fenced property and under proper control in public;</p>
<p>4.4 provide veterinary care when required, and maintain vaccination and parasite control;</p>
<p>4.5 provide daily exercise, mental stimulation and human company appropriate to the breed, and <strong>not</strong> keep the dog in prolonged isolation, permanently chained, or permanently confined to a cage, run or kennel;</p>
<p>4.6 maintain the dog's microchip registration with the Buyer's current contact details;</p>
<p>4.7 notify the Breeder in writing within fourteen (14) days of any change of the Buyer's address, telephone number or email address; and</p>
<p>4.8 never surrender, sell, give away, abandon, rehome or dispose of the dog other than in accordance with clause 6, and never surrender the dog to a shelter, pound, rescue organisation, laboratory, pet shop, dealer or any similar institution.</p>
<p class="contract-ack" data-clause-ref="4_care" data-required="true">I accept these obligations of care for the dog's lifetime.</p>
<p class="contract-ack" data-clause-ref="4_shelter" data-required="true">I understand this breed requires warm, dry shelter and human company, and I will provide both.</p>
<h2>5. WELFARE INSPECTION</h2>
<p>5.1 The Buyer <strong>consents</strong> to the Breeder, or a person nominated by the Breeder in writing, inspecting the dog and the premises at which it is kept, in order to satisfy the Breeder that the obligations in clause 4 are being met.</p>
<p>5.2 Such an inspection will be arranged on reasonable prior notice of not less than forty-eight (48) hours, at a reasonable time, and will not be conducted more than twice in any twelve-month period unless the Breeder has reasonable cause for concern.</p>
<p>5.3 Where an in-person inspection is impractical by reason of distance, the Buyer will on request provide clear, current photographs or video of the dog and its living conditions within seven (7) days.</p>
<p>5.4 <strong>Unreasonable refusal</strong> to permit an inspection under this clause, or failure to provide photographs under clause 5.3, is a material breach of this Agreement and entitles the Breeder to exercise the rights in clause 7.</p>
<p class="contract-ack" data-clause-ref="5" data-required="true">I consent to welfare inspection on notice, and to providing photographs where distance makes a visit impractical.</p>
<h2>6. NO TRANSFER — RETURN TO THE BREEDER</h2>
<p>6.1 <strong>This dog is not transferable.</strong> The Buyer may not sell, give, lend, lease, gift, bequeath or otherwise part with possession of the dog to any other person.</p>
<p>6.2 If at any time and for any reason the Buyer is unable or unwilling to keep the dog, the Buyer <strong>must</strong> notify the Breeder in writing and <strong>return the dog to the Breeder</strong>.</p>
<p>6.3 The Breeder may, on written application and entirely at the Breeder's discretion, approve a transfer to a named alternative home. Any such approval must be <strong>in writing</strong> and given <strong>before</strong> the dog leaves the Buyer's possession. Verbal approval is of no force or effect.</p>
<p>6.4 Where the dog is returned under clause 6.2, or is removed under clause 7, <strong>full ownership of the dog reverts to the Breeder</strong> on the dog coming into the Breeder's possession, and the Buyer will sign any document reasonably required to record that reversion.</p>
<p>6.5 The Buyer acknowledges that the purpose of this clause is to ensure that no dog bred by the Breeder is abandoned, passed between homes, or surrendered to a shelter, and that the Breeder accepts a lifetime obligation to take back any dog it has bred.</p>
<p class="contract-ack" data-clause-ref="6_transfer" data-required="true">I understand the dog may never be sold, given away or rehomed by me.</p>
<p class="contract-ack" data-clause-ref="6_return" data-required="true">I understand that if I cannot keep the dog, I must return it to the Breeder, and that ownership then reverts to the Breeder.</p>
<h2>7. RECALL AND REMOVAL</h2>
<p>7.1 The Breeder may recall and remove the dog where, on reasonable grounds, the Breeder determines that:</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.1 the dog is not receiving adequate food, water, shelter or veterinary care;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.2 the dog is being neglected, ill-treated, or kept in conditions that endanger its physical or mental wellbeing;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.3 the Buyer is no longer able to provide for the dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.4 the dog has been transferred, rehomed or disposed of in breach of clause 6;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.5 the dog has been bred in breach of clause 8; or</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;7.1.6 the Buyer has refused inspection in breach of clause 5.</p>
<p>7.2 Before exercising this right, other than where the dog is in immediate danger, the Breeder will give the Buyer <strong>written notice</strong> specifying the failure and allowing <strong>fourteen (14) days</strong> to remedy it, where it is capable of remedy.</p>
<p>7.3 <strong>Removal is carried out at the Breeder's own cost.</strong> The Buyer will not be charged for collection or transport.</p>
<p>7.4 <strong>Where the dog is removed by reason of the Buyer's breach of this Agreement, no part of the purchase price is refundable</strong>, and the Buyer will have no claim against the Breeder in respect of the purchase price, the dog, or any cost the Buyer has incurred in respect of the dog.</p>
<p>7.5 The Buyer will make the dog available on removal, together with its registration papers, veterinary records and microchip documentation.</p>
<p>7.6 Nothing in this clause limits any right or remedy the Breeder or any competent authority has under the Animals Protection Act 71 of 1962 or equivalent legislation.</p>
<p class="contract-ack" data-clause-ref="7_recall" data-required="true">I understand the Breeder may recall and remove the dog on the grounds listed, after written notice and an opportunity to remedy.</p>
<p class="contract-ack" data-clause-ref="7_refund" data-required="true">I understand that if the dog is removed because I breached this Agreement, I will not be refunded any part of the purchase price.</p>
<h2>8. NO BREEDING RIGHTS</h2>
<p>8.1 <strong>This dog is sold with no breeding rights whatsoever.</strong> The dog is placed as a companion, family or working dog only.</p>
<p>8.2 The Buyer may not mate, breed from, stud out, or permit the mating of the dog, whether for payment or otherwise, and whether or not a litter results.</p>
<p>8.3 The Buyer may not collect, store, sell or use semen or ova from the dog, and may not permit the dog to be used in any artificial insemination or assisted reproduction.</p>
<p>8.4 The Buyer may not apply for full or breeding registration of the dog with any kennel union or registry, nor register any progeny of the dog.</p>
<p>8.5 The Buyer acknowledges that the Breeder's bloodlines are the product of many years of selection, health testing and expense, and that unauthorised breeding causes the Breeder real and substantial loss — including loss of stud and puppy income, dilution of the line, and damage to the Breeder's reputation where dogs of unverified health status circulate under the Breeder's bloodlines.</p>
<p>8.6 In the event of a breach of this clause, the Buyer will be liable to the Breeder for <strong>a penalty of {{breeding_penalty}} per litter conceived or born in breach</strong>.</p>
<p>8.7 The parties record that this figure is a <strong>genuine pre-estimate of the Breeder's loss</strong>, arrived at as follows: a Dobermann litter from these bloodlines commonly numbers between six and ten puppies; the Breeder's own placement prices for such puppies range from R20 000,00 for a standard puppy to R60 000,00 for an elite developed puppy. The agreed penalty is materially <strong>below</strong> the gross value of a single elite litter, and does not attempt to compensate the Breeder for dilution of the bloodline or for reputational harm caused by dogs of unverified health status circulating under the Breeder's name. The Buyer confirms that this basis was explained and that the figure is accepted as reasonable.</p>
<p>8.8 This penalty is payable in addition to, and not in substitution for, the Breeder's right to recall the dog under clause 7 and to claim any further proven loss.</p>
<p class="contract-ack" data-clause-ref="8_rights" data-required="true">I understand this dog is sold with no breeding rights of any kind.</p>
<p class="contract-ack" data-clause-ref="8_penalty" data-required="true">I understand that if I breed from this dog I will be liable for a penalty per litter, and the dog may be recalled.</p>
<h2>9. NAME, REGISTRATION AND REPRESENTATION</h2>
<p>9.1 The dog's registered kennel name may not be changed. A call name of the Buyer's choosing may be used.</p>
<p>9.2 The Buyer will identify the dog as bred by Diedericks Dobermanns where the dog's breeding is stated, and will not represent the dog as bred by any other person.</p>
<p>9.3 The Buyer will not use the Diedericks Dobermanns name, marks or images commercially without the Breeder's prior written consent.</p>
<p class="contract-ack" data-clause-ref="9" data-required="true">I accept the terms on registered name and representation.</p>
<h2>10. DEATH OR LOSS OF THE DOG</h2>
<p>10.1 The Buyer will notify the Breeder in writing within seven (7) days of the death, theft or straying of the dog.</p>
<p>10.2 Where the dog dies before its fifth birthday, the Breeder may request a copy of the veterinary report or, where a post-mortem is performed, its findings. The Breeder relies on this information to monitor the health of the bloodline. The Buyer is not obliged to incur the cost of a post-mortem.</p>
<p class="contract-ack" data-clause-ref="10" data-required="true">I will notify the Breeder if the dog dies, is stolen or goes missing.</p>
<h2>11. ADDENDA</h2>
<p>11.1 Where the dog is placed under one of the Breeder's development or training programmes, the applicable Addendum below is <strong>attached to and forms part of</strong> this Agreement, and the Buyer acknowledges it separately:</p>
<table>
<thead><tr><th>Programme tier</th><th>Addendum</th></tr></thead>
<tbody>
<tr><td>Standard Puppy</td><td><em>(none)</em></td></tr>
<tr><td>Elite Developed Puppy</td><td><strong>Addendum A — Elite Developed Puppy</strong></td></tr>
<tr><td>Elite Family Protection Dog</td><td><strong>Addendum B — Elite Family Protection Dog</strong></td></tr>
</tbody></table>
<p>11.2 An Addendum applies <strong>in addition to</strong>, and not in substitution for, this Agreement. Where an Addendum and this Agreement conflict, the Addendum prevails <strong>only</strong> on the subject matter it expressly addresses; every other term of this Agreement continues in full force.</p>
<p>11.3 This Agreement is not validly concluded in respect of a dog placed under a programme tier unless the corresponding Addendum has also been acknowledged and accepted by the Buyer.</p>
<p class="contract-ack" data-clause-ref="11" data-required="true">I understand that any Addendum listed above forms part of this Agreement.</p>
<h2>12. GENERAL</h2>
<p>12.1 <strong>Entire agreement.</strong> This document, together with any Addendum attached to it, is the entire agreement between the parties. No variation is of any force unless reduced to writing and signed by both parties.</p>
<p>11.2 <strong>Consumer Protection Act.</strong> Nothing in this Agreement is intended to limit or exclude any right the Buyer has under the Consumer Protection Act 68 of 2008 that cannot lawfully be limited or excluded. Where a provision of this Agreement conflicts with such a right, that right prevails and the remainder of this Agreement continues in force.</p>
<p>11.3 <strong>Severability.</strong> If any provision is found unenforceable, it is severed and the remainder continues in force.</p>
<p>11.4 <strong>Governing law and jurisdiction.</strong> This Agreement is governed by the law of the Republic of South Africa. The parties consent to the jurisdiction of the Magistrates' Court having jurisdiction, notwithstanding that the claim may exceed that court's ordinary monetary jurisdiction.</p>
<p>11.5 <strong>Notices.</strong> Written notice may be given by email to the addresses recorded above, or to any address subsequently notified in writing. Notice by email is deemed received on the day of transmission unless the sender receives a delivery failure.</p>
<p>11.6 <strong>Personal information.</strong> The Breeder processes the Buyer's personal information for the purposes of this Agreement, breed health record-keeping and lifetime aftercare, in accordance with the Protection of Personal Information Act 4 of 2013.</p>
<p>11.7 <strong>Electronic signature.</strong> The parties agree that this Agreement may be concluded electronically, and that an electronic acceptance recorded by the Breeder's system constitutes a valid signature for the purposes of the Electronic Communications and Transactions Act 25 of 2002.</p>
<p class="contract-ack" data-clause-ref="12" data-required="true">I have read and understood clauses 11.1 to 11.7.</p>
<hr />
<h2>ACKNOWLEDGEMENT BY THE BUYER</h2>
<p>I confirm that:</p>
<p class="contract-ack" data-clause-ref="ack_1" data-required="true">I have read this Agreement in full, in a language I understand.</p>
<p class="contract-ack" data-clause-ref="ack_2" data-required="true">The terms that place obligations or restrictions on me — in particular clauses 5, 6, 7 and 8 — were drawn to my attention, and I had the opportunity to ask questions before accepting.</p>
<p class="contract-ack" data-clause-ref="ack_3" data-required="true">I was given the opportunity to obtain independent legal advice.</p>
<p class="contract-ack" data-clause-ref="ack_4" data-required="true">I am purchasing this dog for myself and not as an agent for, or for resale to, another person.</p>
<p class="contract-ack" data-clause-ref="ack_5" data-required="true">The information I supplied in my application is true and complete.</p>
<p class="contract-ack" data-clause-ref="ack_6" data-required="true">I accept this Agreement and intend my electronic acceptance to have the same effect as my signature.</p>
<hr />
<table>
<thead><tr><th></th><th>Breeder</th><th>Buyer</th></tr></thead>
<tbody>
<tr><td>Name</td><td>Matthys Diedericks</td><td>{{buyer_full_name}}</td></tr>
<tr><td>Signature</td><td>{{breeder_signature}}</td><td>{{buyer_signature}}</td></tr>
<tr><td>Date</td><td>{{breeder_signed_at}}</td><td>{{buyer_signed_at}}</td></tr>
</tbody></table>
<p><em>Document {{contract_reference}} · version {{template_version}} · generated {{generated_at}}</em></p>$main$,
      is_active = true,
      sort_order = 10,
      programme_tier = NULL,
      is_addendum = false,
      version = 1,
      updated_at = now()
    WHERE id = v_main;
  END IF;

  DELETE FROM contract_clauses WHERE template_id = v_main;
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'preamble', 'I understand that the Breeder retains a lifelong interest in this dog''s welfare, and will always take the dog back.', 1, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '1', 'I understand that ownership is conditional and that conditions continue for the dog''s lifetime.', 2, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '2', 'I understand the 72-hour examination and 7-day notification periods.', 3, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '3', 'I understand what is and is not covered by the health undertaking.', 4, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '4_care', 'I accept these obligations of care for the dog''s lifetime.', 5, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '4_shelter', 'I understand this breed requires warm, dry shelter and human company, and I will provide both.', 6, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '5', 'I consent to welfare inspection on notice, and to providing photographs where distance makes a visit impractical.', 7, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '6_transfer', 'I understand the dog may never be sold, given away or rehomed by me.', 8, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '6_return', 'I understand that if I cannot keep the dog, I must return it to the Breeder, and that ownership then reverts to the Breeder.', 9, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '7_recall', 'I understand the Breeder may recall and remove the dog on the grounds listed, after written notice and an opportunity to remedy.', 10, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '7_refund', 'I understand that if the dog is removed because I breached this Agreement, I will not be refunded any part of the purchase price.', 11, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '8_rights', 'I understand this dog is sold with no breeding rights of any kind.', 12, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '8_penalty', 'I understand that if I breed from this dog I will be liable for a penalty per litter, and the dog may be recalled.', 13, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '9', 'I accept the terms on registered name and representation.', 14, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '10', 'I will notify the Breeder if the dog dies, is stolen or goes missing.', 15, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '11', 'I understand that any Addendum listed above forms part of this Agreement.', 16, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, '12', 'I have read and understood clauses 11.1 to 11.7.', 17, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'ack_1', 'I have read this Agreement in full, in a language I understand.', 18, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'ack_2', 'The terms that place obligations or restrictions on me — in particular clauses 5, 6, 7 and 8 — were drawn to my attention, and I had the opportunity to ask questions before accepting.', 19, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'ack_3', 'I was given the opportunity to obtain independent legal advice.', 20, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'ack_4', 'I am purchasing this dog for myself and not as an agent for, or for resale to, another person.', 21, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'ack_5', 'The information I supplied in my application is true and complete.', 22, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_main, 'ack_6', 'I accept this Agreement and intend my electronic acceptance to have the same effect as my signature.', 23, true);

  SELECT id INTO v_add FROM contract_templates WHERE description = 'key:addendum_a_elite_developed' LIMIT 1;
  IF v_add IS NULL THEN
    INSERT INTO contract_templates (
      name, contract_title, description, body_html, is_active, sort_order,
      programme_tier, is_addendum, version
    ) VALUES (
      'Addendum A — Elite Developed Puppy',
      'Addendum A — Elite Developed Puppy',
      'key:addendum_a_elite_developed',
      $add$<h1>ADDENDUM A — ELITE DEVELOPED PUPPY</h1>
<p><strong>Attached to and forming part of Agreement {{contract_number}}</strong></p>
<p><strong>Diedericks Dobermanns</strong> <em>Born With Purpose. Built With Discipline.</em></p>
<p><strong>Addendum <code>{{contract_number}}-A</code></strong> · Quote {{quote_number}} · Invoice {{invoice_number}}</p>
<blockquote><p>We develop these dogs because we care what they become. This Addendum exists so that you know exactly what you are receiving, and so that the work already put into this dog is not lost. Our interest in its wellbeing continues for its whole life.</p></blockquote>
<hr />
<h2>PARTIES AND DOG</h2>
<p>This Addendum applies to the sale of {{dog_name}} ({{dog_microchip}}) to {{buyer_full_name}} under Agreement {{contract_reference}}, and applies <strong>in addition to</strong> every term of that Agreement.</p>
<p>Where this Addendum and the main Agreement conflict, this Addendum prevails <strong>in respect of the dog's training and development only</strong>. Every other term of the main Agreement — including welfare inspection, no transfer, recall and removal, and no breeding rights — continues in full force.</p>
<hr />
<h2>A1. WHAT THIS DOG IS</h2>
<p>A1.1 This dog has been retained and developed in the Breeder's programme to approximately <strong>six (6) months of age</strong> before placement.</p>
<p>A1.2 During that period the dog has received structured work in the following areas, to the best of that individual dog's ability and stage of maturity:</p>
<table>
<thead><tr><th>Area</th><th>What was done</th></tr></thead>
<tbody>
<tr><td><strong>Obedience foundation</strong></td><td>{{obedience_summary}}</td></tr>
<tr><td><strong>Home obedience</strong></td><td>{{home_obedience_summary}}</td></tr>
<tr><td><strong>Protection — pre-work only</strong></td><td>{{protection_prework_summary}}</td></tr>
<tr><td><strong>Environmental exposure</strong></td><td>{{environmental_summary}}</td></tr>
<tr><td><strong>Socialisation</strong></td><td>{{socialisation_summary}}</td></tr>
</tbody></table>
<p>A1.3 The Breeder has developed this dog <strong>to the best of its individual ability</strong> at this stage of its life. Dogs are individuals. What one dog achieves by six months, another of the same litter may reach later or differently.</p>
<p>A1.4 A written record of the work completed, and video where available, is provided to the Buyer and is available in the Buyer's client portal.</p>
<p class="contract-ack" data-clause-ref="A1" data-required="true">I have read the record of the work completed with this dog.</p>
<h2>A2. WHAT THIS DOG IS <strong>NOT</strong></h2>
<p><strong>This is the most important clause in this Addendum. Read it carefully.</strong></p>
<p>A2.1 <strong>This dog is NOT a fully trained dog.</strong> It is a <em>developed</em> dog.</p>
<p>A2.2 In particular, and without limitation, this dog is <strong>not</strong>:</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.1 a fully trained protection dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.2 a trained personal protection or family protection dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.3 a certified, titled or trialled dog in any discipline;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.4 a security dog, guard dog or patrol dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.5 a dog that has completed a protection programme; nor</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.6 a dog that can be relied upon to protect any person or property.</p>
<p>A2.3 The protection component of this dog's development is <strong>foundation and pre-work only</strong> — building drive, confidence, grip and clarity in a young dog. It is the groundwork on which protection training may later be built by a competent trainer. <strong>It is not protection training, and it does not produce a dog that will protect.</strong></p>
<p>A2.4 The Buyer must not represent, advertise, hold out or deploy this dog as a trained protection, guard or security dog.</p>
<p>A2.5 The Breeder makes <strong>no representation and gives no undertaking</strong> that this dog will protect any person or property, will behave in any particular way in any particular situation, or will attain any particular standard in any discipline.</p>
<p>A2.6 Where the Buyer requires a dog that is genuinely trained for protection, the Breeder's <strong>Elite Family Protection Dog</strong> is that product and is sold separately.</p>
<p class="contract-ack" data-clause-ref="A2_developed" data-required="true">I understand this dog is a DEVELOPED dog, not a fully trained dog.</p>
<p class="contract-ack" data-clause-ref="A2_not_protection" data-required="true">I understand this dog is NOT a trained protection dog and cannot be relied on to protect me, my family or my property.</p>
<p class="contract-ack" data-clause-ref="A2_prework" data-required="true">I understand the protection work done is foundation and pre-work only.</p>
<p class="contract-ack" data-clause-ref="A2_represent" data-required="true">I will not advertise, represent or deploy this dog as a trained protection, guard or security dog.</p>
<h2>A3. THE BUYER'S OBLIGATION TO CONTINUE DEVELOPMENT</h2>
<p>A3.1 The Buyer acknowledges that a developed dog is <strong>partway through its education, not at the end of it</strong>, and that what has been built will be lost without continued work.</p>
<p>A3.2 The Buyer undertakes to continue this dog's development in <strong>all</strong> of the following areas, appropriate to its age and stage:</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.1 <strong>Obedience</strong> — maintaining and advancing the foundation laid;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.2 <strong>Home obedience and manners</strong> — applying that obedience in daily life;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.3 <strong>Socialisation</strong> — continued positive exposure to people, dogs and situations;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.4 <strong>Environmental exposure</strong> — continued exposure to novel surfaces, sounds, places and conditions; and</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.5 <strong>Physical development</strong> — appropriate exercise and conditioning for a growing dog, avoiding over-exercise during growth.</p>
<p>A3.3 Where the Buyer intends this dog to progress in <strong>protection work</strong>, that work must be undertaken with a <strong>competent, experienced protection trainer</strong>. The Buyer must not attempt protection training without such a trainer, and must not permit any person to agitate, provoke or "test" the dog outside structured training with a competent trainer.</p>
<p>A3.4 The Buyer acknowledges that untrained, unqualified or amateur protection work is the most common cause of ruining a young dog of this type, producing a dog that is unclear, defensive or dangerous. Doing so is a breach of this Addendum.</p>
<p>A3.5 The Breeder will make reasonable aftercare guidance available to the Buyer, and the Buyer is encouraged to make use of it.</p>
<p class="contract-ack" data-clause-ref="A3_continue" data-required="true">I undertake to continue this dog's development in obedience, home obedience, socialisation, environmental exposure and physical conditioning.</p>
<p class="contract-ack" data-clause-ref="A3_trainer" data-required="true">I understand that if I want protection work, it must be done with a competent protection trainer.</p>
<p class="contract-ack" data-clause-ref="A3_amateur" data-required="true">I understand that amateur or unqualified protection work will ruin this dog and is a breach of this Agreement.</p>
<h2>A4. HANDOVER</h2>
<p>A4.1 This dog is <strong>delivered personally by the Breeder</strong>, and a formal handover is conducted at which the Breeder demonstrates the work completed and instructs the Buyer in how to maintain and continue it.</p>
<p>A4.2 The Buyer will attend the handover in person and will make reasonable arrangements for anyone who will be handling the dog regularly to attend.</p>
<p>A4.3 Failure to attend the handover does not entitle the Buyer to any refund or reduction of the purchase price.</p>
<p class="contract-ack" data-clause-ref="A4" data-required="true">I will attend the handover in person.</p>
<h2>A5. BEHAVIOUR, CONTROL AND LIABILITY</h2>
<p><strong>A5.1</strong> The Buyer acknowledges that from the moment the dog is delivered, <strong>the Buyer is the owner and handler of the dog</strong>, and is responsible for its containment, control and conduct at all times.</p>
<p><strong>A5.2</strong> The Buyer acknowledges being advised that, under South African law, the owner of a domesticated animal may be held <strong>strictly liable</strong> for harm the animal causes, without proof of fault on the owner's part. The Buyer accepts that this liability attaches to the Buyer as owner.</p>
<p><strong>A5.3</strong> The Buyer will keep the dog securely contained, under proper control in public, and will not allow it to be handled by any person incapable of controlling it.</p>
<p><strong>A5.4</strong> The Breeder is not liable for the conduct of the dog after delivery, save to the extent that liability cannot lawfully be excluded. Nothing in this clause excludes liability for the Breeder's own gross negligence or for any liability that may not lawfully be limited under the Consumer Protection Act 68 of 2008.</p>
<p><strong>A5.5</strong> The Buyer is strongly advised to obtain third-party liability insurance covering the dog, and to confirm that any existing household policy does not exclude the breed.</p>
<p class="contract-ack" data-clause-ref="A5_owner" data-required="true">I understand that once the dog is delivered, I am the owner and I am responsible for its behaviour and containment.</p>
<p class="contract-ack" data-clause-ref="A5_liable" data-required="true">I understand that as owner I may be held liable for harm the dog causes.</p>
<p class="contract-ack" data-clause-ref="A5_insurance" data-required="true">I have been advised to obtain third-party liability insurance.</p>
<h2>A6. FAILURE TO CONTINUE DEVELOPMENT</h2>
<p>A6.1 A sustained failure to continue this dog's development, or the undertaking of protection work otherwise than in accordance with clause A3.3, is a <strong>material breach</strong> of this Addendum.</p>
<p>A6.2 On such a breach, the Breeder may exercise the rights in <strong>clause 7 of the main Agreement</strong>, including recall and removal of the dog, subject to the written notice and opportunity to remedy provided for in clause 7.2, and with the consequences set out in clauses 7.3 and 7.4.</p>
<p>A6.3 The Breeder recognises that a dog left without work becomes frustrated, difficult and in some cases dangerous, and that removal in such circumstances is in the dog's interest as much as the Breeder's.</p>
<p class="contract-ack" data-clause-ref="A6" data-required="true">I understand that failing to continue this dog's development is a breach that may result in the dog being recalled.</p>
<hr />
<h2>ACKNOWLEDGEMENT BY THE BUYER — ELITE DEVELOPED PUPPY</h2>
<p>I confirm that:</p>
<p class="contract-ack" data-clause-ref="A_ack_1" data-required="true">I understand the difference between a **developed** dog and a **fully trained** dog, and that I am buying a developed dog.</p>
<p class="contract-ack" data-clause-ref="A_ack_2" data-required="true">I was not told, and do not believe, that this dog will protect me, my family or my property.</p>
<p class="contract-ack" data-clause-ref="A_ack_3" data-required="true">I understand that this dog's future depends substantially on the work **I** put into it from here.</p>
<p class="contract-ack" data-clause-ref="A_ack_4" data-required="true">Clause A2 (what this dog is not) and clause A5 (liability) were specifically drawn to my attention, and I had the opportunity to ask questions.</p>
<p class="contract-ack" data-clause-ref="A_ack_5" data-required="true">I accept this Addendum on the same terms and with the same effect as the main Agreement.</p>
<hr />
<table>
<thead><tr><th></th><th>Breeder</th><th>Buyer</th></tr></thead>
<tbody>
<tr><td>Name</td><td>Matthys Diedericks</td><td>{{buyer_full_name}}</td></tr>
<tr><td>Signature</td><td>{{breeder_signature}}</td><td>{{buyer_signature}}</td></tr>
<tr><td>Date</td><td>{{breeder_signed_at}}</td><td>{{buyer_signed_at}}</td></tr>
</tbody></table>
<p><em>Addendum A to {{contract_reference}} · version {{template_version}} · generated {{generated_at}}</em></p>$add$,
      true, 20, 'elite_developed', true, 1
    ) RETURNING id INTO v_add;
  ELSE
    UPDATE contract_templates SET
      name = 'Addendum A — Elite Developed Puppy',
      contract_title = 'Addendum A — Elite Developed Puppy',
      body_html = $add$<h1>ADDENDUM A — ELITE DEVELOPED PUPPY</h1>
<p><strong>Attached to and forming part of Agreement {{contract_number}}</strong></p>
<p><strong>Diedericks Dobermanns</strong> <em>Born With Purpose. Built With Discipline.</em></p>
<p><strong>Addendum <code>{{contract_number}}-A</code></strong> · Quote {{quote_number}} · Invoice {{invoice_number}}</p>
<blockquote><p>We develop these dogs because we care what they become. This Addendum exists so that you know exactly what you are receiving, and so that the work already put into this dog is not lost. Our interest in its wellbeing continues for its whole life.</p></blockquote>
<hr />
<h2>PARTIES AND DOG</h2>
<p>This Addendum applies to the sale of {{dog_name}} ({{dog_microchip}}) to {{buyer_full_name}} under Agreement {{contract_reference}}, and applies <strong>in addition to</strong> every term of that Agreement.</p>
<p>Where this Addendum and the main Agreement conflict, this Addendum prevails <strong>in respect of the dog's training and development only</strong>. Every other term of the main Agreement — including welfare inspection, no transfer, recall and removal, and no breeding rights — continues in full force.</p>
<hr />
<h2>A1. WHAT THIS DOG IS</h2>
<p>A1.1 This dog has been retained and developed in the Breeder's programme to approximately <strong>six (6) months of age</strong> before placement.</p>
<p>A1.2 During that period the dog has received structured work in the following areas, to the best of that individual dog's ability and stage of maturity:</p>
<table>
<thead><tr><th>Area</th><th>What was done</th></tr></thead>
<tbody>
<tr><td><strong>Obedience foundation</strong></td><td>{{obedience_summary}}</td></tr>
<tr><td><strong>Home obedience</strong></td><td>{{home_obedience_summary}}</td></tr>
<tr><td><strong>Protection — pre-work only</strong></td><td>{{protection_prework_summary}}</td></tr>
<tr><td><strong>Environmental exposure</strong></td><td>{{environmental_summary}}</td></tr>
<tr><td><strong>Socialisation</strong></td><td>{{socialisation_summary}}</td></tr>
</tbody></table>
<p>A1.3 The Breeder has developed this dog <strong>to the best of its individual ability</strong> at this stage of its life. Dogs are individuals. What one dog achieves by six months, another of the same litter may reach later or differently.</p>
<p>A1.4 A written record of the work completed, and video where available, is provided to the Buyer and is available in the Buyer's client portal.</p>
<p class="contract-ack" data-clause-ref="A1" data-required="true">I have read the record of the work completed with this dog.</p>
<h2>A2. WHAT THIS DOG IS <strong>NOT</strong></h2>
<p><strong>This is the most important clause in this Addendum. Read it carefully.</strong></p>
<p>A2.1 <strong>This dog is NOT a fully trained dog.</strong> It is a <em>developed</em> dog.</p>
<p>A2.2 In particular, and without limitation, this dog is <strong>not</strong>:</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.1 a fully trained protection dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.2 a trained personal protection or family protection dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.3 a certified, titled or trialled dog in any discipline;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.4 a security dog, guard dog or patrol dog;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.5 a dog that has completed a protection programme; nor</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A2.2.6 a dog that can be relied upon to protect any person or property.</p>
<p>A2.3 The protection component of this dog's development is <strong>foundation and pre-work only</strong> — building drive, confidence, grip and clarity in a young dog. It is the groundwork on which protection training may later be built by a competent trainer. <strong>It is not protection training, and it does not produce a dog that will protect.</strong></p>
<p>A2.4 The Buyer must not represent, advertise, hold out or deploy this dog as a trained protection, guard or security dog.</p>
<p>A2.5 The Breeder makes <strong>no representation and gives no undertaking</strong> that this dog will protect any person or property, will behave in any particular way in any particular situation, or will attain any particular standard in any discipline.</p>
<p>A2.6 Where the Buyer requires a dog that is genuinely trained for protection, the Breeder's <strong>Elite Family Protection Dog</strong> is that product and is sold separately.</p>
<p class="contract-ack" data-clause-ref="A2_developed" data-required="true">I understand this dog is a DEVELOPED dog, not a fully trained dog.</p>
<p class="contract-ack" data-clause-ref="A2_not_protection" data-required="true">I understand this dog is NOT a trained protection dog and cannot be relied on to protect me, my family or my property.</p>
<p class="contract-ack" data-clause-ref="A2_prework" data-required="true">I understand the protection work done is foundation and pre-work only.</p>
<p class="contract-ack" data-clause-ref="A2_represent" data-required="true">I will not advertise, represent or deploy this dog as a trained protection, guard or security dog.</p>
<h2>A3. THE BUYER'S OBLIGATION TO CONTINUE DEVELOPMENT</h2>
<p>A3.1 The Buyer acknowledges that a developed dog is <strong>partway through its education, not at the end of it</strong>, and that what has been built will be lost without continued work.</p>
<p>A3.2 The Buyer undertakes to continue this dog's development in <strong>all</strong> of the following areas, appropriate to its age and stage:</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.1 <strong>Obedience</strong> — maintaining and advancing the foundation laid;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.2 <strong>Home obedience and manners</strong> — applying that obedience in daily life;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.3 <strong>Socialisation</strong> — continued positive exposure to people, dogs and situations;</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.4 <strong>Environmental exposure</strong> — continued exposure to novel surfaces, sounds, places and conditions; and</p>
<p>&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;A3.2.5 <strong>Physical development</strong> — appropriate exercise and conditioning for a growing dog, avoiding over-exercise during growth.</p>
<p>A3.3 Where the Buyer intends this dog to progress in <strong>protection work</strong>, that work must be undertaken with a <strong>competent, experienced protection trainer</strong>. The Buyer must not attempt protection training without such a trainer, and must not permit any person to agitate, provoke or "test" the dog outside structured training with a competent trainer.</p>
<p>A3.4 The Buyer acknowledges that untrained, unqualified or amateur protection work is the most common cause of ruining a young dog of this type, producing a dog that is unclear, defensive or dangerous. Doing so is a breach of this Addendum.</p>
<p>A3.5 The Breeder will make reasonable aftercare guidance available to the Buyer, and the Buyer is encouraged to make use of it.</p>
<p class="contract-ack" data-clause-ref="A3_continue" data-required="true">I undertake to continue this dog's development in obedience, home obedience, socialisation, environmental exposure and physical conditioning.</p>
<p class="contract-ack" data-clause-ref="A3_trainer" data-required="true">I understand that if I want protection work, it must be done with a competent protection trainer.</p>
<p class="contract-ack" data-clause-ref="A3_amateur" data-required="true">I understand that amateur or unqualified protection work will ruin this dog and is a breach of this Agreement.</p>
<h2>A4. HANDOVER</h2>
<p>A4.1 This dog is <strong>delivered personally by the Breeder</strong>, and a formal handover is conducted at which the Breeder demonstrates the work completed and instructs the Buyer in how to maintain and continue it.</p>
<p>A4.2 The Buyer will attend the handover in person and will make reasonable arrangements for anyone who will be handling the dog regularly to attend.</p>
<p>A4.3 Failure to attend the handover does not entitle the Buyer to any refund or reduction of the purchase price.</p>
<p class="contract-ack" data-clause-ref="A4" data-required="true">I will attend the handover in person.</p>
<h2>A5. BEHAVIOUR, CONTROL AND LIABILITY</h2>
<p><strong>A5.1</strong> The Buyer acknowledges that from the moment the dog is delivered, <strong>the Buyer is the owner and handler of the dog</strong>, and is responsible for its containment, control and conduct at all times.</p>
<p><strong>A5.2</strong> The Buyer acknowledges being advised that, under South African law, the owner of a domesticated animal may be held <strong>strictly liable</strong> for harm the animal causes, without proof of fault on the owner's part. The Buyer accepts that this liability attaches to the Buyer as owner.</p>
<p><strong>A5.3</strong> The Buyer will keep the dog securely contained, under proper control in public, and will not allow it to be handled by any person incapable of controlling it.</p>
<p><strong>A5.4</strong> The Breeder is not liable for the conduct of the dog after delivery, save to the extent that liability cannot lawfully be excluded. Nothing in this clause excludes liability for the Breeder's own gross negligence or for any liability that may not lawfully be limited under the Consumer Protection Act 68 of 2008.</p>
<p><strong>A5.5</strong> The Buyer is strongly advised to obtain third-party liability insurance covering the dog, and to confirm that any existing household policy does not exclude the breed.</p>
<p class="contract-ack" data-clause-ref="A5_owner" data-required="true">I understand that once the dog is delivered, I am the owner and I am responsible for its behaviour and containment.</p>
<p class="contract-ack" data-clause-ref="A5_liable" data-required="true">I understand that as owner I may be held liable for harm the dog causes.</p>
<p class="contract-ack" data-clause-ref="A5_insurance" data-required="true">I have been advised to obtain third-party liability insurance.</p>
<h2>A6. FAILURE TO CONTINUE DEVELOPMENT</h2>
<p>A6.1 A sustained failure to continue this dog's development, or the undertaking of protection work otherwise than in accordance with clause A3.3, is a <strong>material breach</strong> of this Addendum.</p>
<p>A6.2 On such a breach, the Breeder may exercise the rights in <strong>clause 7 of the main Agreement</strong>, including recall and removal of the dog, subject to the written notice and opportunity to remedy provided for in clause 7.2, and with the consequences set out in clauses 7.3 and 7.4.</p>
<p>A6.3 The Breeder recognises that a dog left without work becomes frustrated, difficult and in some cases dangerous, and that removal in such circumstances is in the dog's interest as much as the Breeder's.</p>
<p class="contract-ack" data-clause-ref="A6" data-required="true">I understand that failing to continue this dog's development is a breach that may result in the dog being recalled.</p>
<hr />
<h2>ACKNOWLEDGEMENT BY THE BUYER — ELITE DEVELOPED PUPPY</h2>
<p>I confirm that:</p>
<p class="contract-ack" data-clause-ref="A_ack_1" data-required="true">I understand the difference between a **developed** dog and a **fully trained** dog, and that I am buying a developed dog.</p>
<p class="contract-ack" data-clause-ref="A_ack_2" data-required="true">I was not told, and do not believe, that this dog will protect me, my family or my property.</p>
<p class="contract-ack" data-clause-ref="A_ack_3" data-required="true">I understand that this dog's future depends substantially on the work **I** put into it from here.</p>
<p class="contract-ack" data-clause-ref="A_ack_4" data-required="true">Clause A2 (what this dog is not) and clause A5 (liability) were specifically drawn to my attention, and I had the opportunity to ask questions.</p>
<p class="contract-ack" data-clause-ref="A_ack_5" data-required="true">I accept this Addendum on the same terms and with the same effect as the main Agreement.</p>
<hr />
<table>
<thead><tr><th></th><th>Breeder</th><th>Buyer</th></tr></thead>
<tbody>
<tr><td>Name</td><td>Matthys Diedericks</td><td>{{buyer_full_name}}</td></tr>
<tr><td>Signature</td><td>{{breeder_signature}}</td><td>{{buyer_signature}}</td></tr>
<tr><td>Date</td><td>{{breeder_signed_at}}</td><td>{{buyer_signed_at}}</td></tr>
</tbody></table>
<p><em>Addendum A to {{contract_reference}} · version {{template_version}} · generated {{generated_at}}</em></p>$add$,
      is_active = true,
      sort_order = 20,
      programme_tier = 'elite_developed',
      is_addendum = true,
      version = 1,
      updated_at = now()
    WHERE id = v_add;
  END IF;

  DELETE FROM contract_clauses WHERE template_id = v_add;
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A1', 'I have read the record of the work completed with this dog.', 1, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A2_developed', 'I understand this dog is a DEVELOPED dog, not a fully trained dog.', 2, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A2_not_protection', 'I understand this dog is NOT a trained protection dog and cannot be relied on to protect me, my family or my property.', 3, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A2_prework', 'I understand the protection work done is foundation and pre-work only.', 4, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A2_represent', 'I will not advertise, represent or deploy this dog as a trained protection, guard or security dog.', 5, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A3_continue', 'I undertake to continue this dog''s development in obedience, home obedience, socialisation, environmental exposure and physical conditioning.', 6, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A3_trainer', 'I understand that if I want protection work, it must be done with a competent protection trainer.', 7, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A3_amateur', 'I understand that amateur or unqualified protection work will ruin this dog and is a breach of this Agreement.', 8, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A4', 'I will attend the handover in person.', 9, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A5_owner', 'I understand that once the dog is delivered, I am the owner and I am responsible for its behaviour and containment.', 10, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A5_liable', 'I understand that as owner I may be held liable for harm the dog causes.', 11, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A5_insurance', 'I have been advised to obtain third-party liability insurance.', 12, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A6', 'I understand that failing to continue this dog''s development is a breach that may result in the dog being recalled.', 13, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A_ack_1', 'I understand the difference between a **developed** dog and a **fully trained** dog, and that I am buying a developed dog.', 14, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A_ack_2', 'I was not told, and do not believe, that this dog will protect me, my family or my property.', 15, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A_ack_3', 'I understand that this dog''s future depends substantially on the work **I** put into it from here.', 16, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A_ack_4', 'Clause A2 (what this dog is not) and clause A5 (liability) were specifically drawn to my attention, and I had the opportunity to ask questions.', 17, true);
  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (v_add, 'A_ack_5', 'I accept this Addendum on the same terms and with the same effect as the main Agreement.', 18, true);
END $$;

COMMIT;
