
update wfs."Brandweervoorziening" set "Code" = replace("Code", '.', '') where "Code" like '%.%';

update wfs."Brandweervoorziening"
set "Code" = replace((
    select brandweervoorziening_symbool
    from dbk.type_brandweervoorziening t
    where t.gid = "Symbol_Type_ID")
,'.','')
where "Code" is null or "Code" = '';

update wfs."Brandweervoorziening" set "Code" = 'Tb1004a' where "Symbol_Type_ID" = 1004;
update wfs."Brandweervoorziening" set "Code" = 'Tbk5001' where "Symbol_Type_ID" = 1013;
update wfs."Brandweervoorziening" set "Code" = 'Openwater' where "Symbol_Type_ID" = 1015;
update wfs."Brandweervoorziening" set "Code" = 'Falck1' where "Symbol_Type_ID" = 1031;



