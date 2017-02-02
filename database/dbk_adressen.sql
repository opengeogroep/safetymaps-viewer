create view dbk."Adressen" as
select "DBK_ID" as identificatie,
  (select array_to_json(array_agg(row_to_json(r.*)))
  from
  (select "Postcode" as postcode, "Plaats" as woonplaats, "Straatnaam" as straat,
    array_to_json(array_agg(distinct
      "Huisnummer" || case when "Huisletter" <> '' or "Toevoeging" <> '' then '|' || "Huisletter" || '|' || "Toevoeging" else '' end
    )) as nummers
  from wfs."AdresDBKneven"
  where "DBK_ID"=t."DBK_ID"
  group by postcode, woonplaats, straat) r) json
from wfs."AdresDBKneven" t
