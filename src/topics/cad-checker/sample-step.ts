/** In-repo STEP assembly fixture (SolidWorks→STEP stand-in) for guided demo. */
export const SAMPLE_SW_HABITAT_ASSY_STEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Flame in Freefall — sample SolidWorks-style STEP assembly fixture'),'2;1');
FILE_NAME('sample-sw-habitat-assy.step','2026-11-15',('Flame'),('NASA Space Apps'),
  'Flame fixture (not a vendor kernel export)','Flame in Freefall','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#10=PRODUCT('habitat-cover-assy','Habitat Cover Assembly','',(#11));
#20=PRODUCT('PMMA','Acrylic Cover Panel','',(#21));
#30=PRODUCT('Aluminum','Aluminum Frame','',(#31));
#40=PRODUCT('Avionics_Heater','Avionics Bay Heater','',(#41));
#50=PRODUCT('Nomex','Nomex Softgoods Liner','',(#51));
#60=MATERIAL('mat','PMMA');
#70=MATERIAL('mat','Aluminum');
#100=NEXT_ASSEMBLY_USAGE_OCCURRENCE('nauo-pmma','','',#10,#20);
#101=NEXT_ASSEMBLY_USAGE_OCCURRENCE('nauo-al','','',#10,#30);
#102=NEXT_ASSEMBLY_USAGE_OCCURRENCE('nauo-heat','','',#10,#40);
#103=NEXT_ASSEMBLY_USAGE_OCCURRENCE('nauo-nomex','','',#10,#50);
ENDSEC;
END-ISO-10303-21;
`;

/** AP214-style chain: NAUO references PRODUCT_DEFINITION, not PRODUCT directly. */
export const SAMPLE_AP214_HABITAT_ASSY_STEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Flame AP214-style PRODUCT_DEFINITION chain fixture'),'2;1');
FILE_NAME('sample-ap214-habitat-assy.step','2026-11-15',('Flame'),('NASA Space Apps'),
  'AP214 NAUO via PRODUCT_DEFINITION','Flame in Freefall','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#10=PRODUCT('habitat-assy','Habitat Assembly','',(#11));
#20=PRODUCT('PMMA','PMMA Cover','',(#21));
#30=PRODUCT('Avionics_Heater','Avionics Heater','',(#31));
#12=PRODUCT_DEFINITION_FORMATION('','',#10);
#13=PRODUCT_DEFINITION('design','',#12,#14);
#22=PRODUCT_DEFINITION_FORMATION('','',#20);
#23=PRODUCT_DEFINITION('design','',#22,#24);
#32=PRODUCT_DEFINITION_FORMATION('','',#30);
#33=PRODUCT_DEFINITION('design','',#32,#34);
#100=NEXT_ASSEMBLY_USAGE_OCCURRENCE('nauo-pmma','','',#13,#23);
#101=NEXT_ASSEMBLY_USAGE_OCCURRENCE('nauo-heat','','',#13,#33);
#200=MATERIAL('mat','PMMA');
ENDSEC;
END-ISO-10303-21;
`;

