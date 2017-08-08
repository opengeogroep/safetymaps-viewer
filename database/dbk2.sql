drop schema if exists dbk2 cascade;
create schema dbk2;

CREATE OR REPLACE VIEW dbk2."DBKFeature" AS 
 SELECT d.gid,
    d."DBK_ID" AS identificatie,
        CASE
            WHEN d2."BHVaanwezig" IS NULL THEN false
            ELSE
            CASE
                WHEN lower(d2."BHVaanwezig"::text) = ANY (ARRAY['ja'::text, 'yes'::text]) THEN true
                ELSE false
            END
        END AS "BHVaanwezig",
        CASE
            WHEN d."Datum_Actualisatie"::text = ''::text THEN NULL::timestamp without time zone
            ELSE to_timestamp(d."Datum_Actualisatie"::text, 'YYYYMMDDHH24MISSMS'::text)::timestamp without time zone
        END AS "controleDatum",
    d."Formele_Naam" AS "formeleNaam",
    d."Informele_Naam" AS "informeleNaam",
        CASE
            WHEN d."Nummer"::text = ''::text THEN NULL::character varying
            ELSE d."Nummer"
        END AS "OMSNummer",
        CASE
            WHEN d2.inzetprocedure::text = ''::text THEN NULL::character varying
            ELSE d2.inzetprocedure
        END AS inzetprocedure,
    d2."Bouwlaag" AS bouwlaag,
    d2."RisicoKlasse" AS risicoklasse,
        CASE
            WHEN d2."soortDBK"::text = ANY (ARRAY['Evenement'::character varying::text, 'Waterongevallen'::character varying::text]) THEN d2."soortDBK"::text
            ELSE 'Object'::text
        END AS "typeFeature",
        CASE
            WHEN NOT g.geometrie IS NULL THEN g.geometrie
            ELSE
            CASE
                WHEN NOT b.geometrie IS NULL THEN b.geometrie
                ELSE NULL::geometry
            END
        END AS geometrie,
    d.verwerkt,
        CASE
            WHEN d2."Hoofdobject_ID" = 0 THEN NULL::integer
            ELSE d2."Hoofdobject_ID"
        END AS hoofdobject,
    d2."Viewer" AS viewer,
        CASE
            WHEN d2."DatumTijd_Viewer_Begin"::text = ''::text THEN NULL::timestamp without time zone
            ELSE to_timestamp(d2."DatumTijd_Viewer_Begin"::text, 'YYYYMMDDHH24MISSMS'::text)::timestamp without time zone
        END AS datumtijdviewerbegin,
        CASE
            WHEN d2."DatumTijd_Viewer_Eind"::text = ''::text THEN NULL::timestamp without time zone
            ELSE to_timestamp(d2."DatumTijd_Viewer_Eind"::text, 'YYYYMMDDHH24MISSMS'::text)::timestamp without time zone
        END AS datumtijdviewereind
   FROM wfs."DBK" d
     LEFT JOIN wfs."DBK2" d2 ON d."DBK_ID" = d2."DBK_ID"
     LEFT JOIN ( SELECT "Polygon"."DBK_ID" AS dbkfeature_id,
            st_setsrid(st_centroid(st_collect(st_transform("Polygon".the_geom, 28992))), 28992) AS geometrie
           FROM wfs."Polygon"
          GROUP BY "Polygon"."DBK_ID") b ON d."DBK_ID" = b.dbkfeature_id
     LEFT JOIN ( SELECT "Gebied"."DBK_ID" AS dbkfeature_id,
            st_setsrid(st_centroid(st_collect(st_transform("Gebied".the_geom, 28992))), 28992) AS geometrie
           FROM wfs."Gebied"
          GROUP BY "Gebied"."DBK_ID") g ON d."DBK_ID" = g.dbkfeature_id
  WHERE d."Deleted" = false OR d."Deleted" IS NULL;
GRANT SELECT ON TABLE dbk2."DBKFeature" TO public;

CREATE OR REPLACE VIEW dbk2."DBKObject" AS 
 SELECT f.gid,
    f."DBK_ID" AS dbkfeature_id,
        CASE
            WHEN f."Bouwlaag_Max"::text ~ '^\d+$'::text THEN f."Bouwlaag_Max"::integer
            ELSE NULL::integer
        END AS "hoogsteBouwlaag",
        CASE
            WHEN f."Bouwlaag_Min"::text ~ '^\d+$'::text THEN f."Bouwlaag_Min"::integer
            ELSE NULL::integer
        END AS "laagsteBouwlaag",
        CASE
            WHEN f."Nummer"::text = ''::text THEN NULL::character varying
            ELSE f."Nummer"
        END AS "OMSnummer",
        CASE
            WHEN o."Gebouwconstructie"::text = ''::text THEN NULL::character varying
            ELSE o."Gebouwconstructie"
        END AS gebouwconstructie,
    f."Adres_ID" AS adres_id,
        CASE
            WHEN f."Gebruikstype"::text = ''::text THEN NULL::character varying
            ELSE f."Gebruikstype"
        END AS gebruikstype
   FROM wfs."DBK" f
     LEFT JOIN ( SELECT "Object".gid,
            "Object"."DBK_ID",
            "Object"."Section_ID",
            "Object"."Nummer",
            "Object"."Adres_ID",
            "Object"."Gebruikstype",
            "Object"."Gebouwconstructie",
            "Object"."Bouwlaag_Max",
            "Object"."Bouwlaag_Min",
            "Object"."Licence_ID"
           FROM wfs."Object") o ON f."DBK_ID" = o."DBK_ID"
  WHERE f."Deleted" = false OR f."Deleted" IS NULL;
GRANT SELECT ON TABLE dbk2."DBKObject" TO public;

CREATE OR REPLACE VIEW dbk2."Pandgeometrie" AS 
 SELECT "Polygon".gid,
    "Polygon"."DBK_ID" AS dbkfeature_id,
    "Polygon".the_geom AS geometrie,
    "Polygon"."BAG_Pand_ID" AS "bagId",
    NULL::character varying AS "bagStatus"
   FROM wfs."Polygon";
GRANT SELECT ON TABLE dbk2."Pandgeometrie" TO public;

CREATE OR REPLACE VIEW dbk2."Adressen" AS 
 SELECT t."DBK_ID" AS identificatie,
    ( SELECT array_to_json(array_agg(row_to_json(r.*))) AS array_to_json
           FROM ( SELECT "AdresDBKneven"."Postcode" AS postcode,
                    "AdresDBKneven"."Plaats" AS woonplaats,
                    "AdresDBKneven"."Straatnaam" AS straat,
                    array_to_json(array_agg(DISTINCT "AdresDBKneven"."Huisnummer" ||
                        CASE
                            WHEN "AdresDBKneven"."Huisletter"::text <> ''::text OR "AdresDBKneven"."Toevoeging"::text <> ''::text THEN (('|'::text || "AdresDBKneven"."Huisletter"::text) || '|'::text) || "AdresDBKneven"."Toevoeging"::text
                            ELSE ''::text
                        END)) AS nummers
                   FROM wfs."AdresDBKneven"
                  WHERE "AdresDBKneven"."DBK_ID" = t."DBK_ID"
                  GROUP BY "AdresDBKneven"."Postcode", "AdresDBKneven"."Plaats", "AdresDBKneven"."Straatnaam") r) AS json
   FROM ( SELECT DISTINCT "AdresDBKneven"."DBK_ID"
           FROM wfs."AdresDBKneven") t;
GRANT SELECT ON TABLE dbk2."Adressen" TO public;

create view dbk2."Adres" as (
   SELECT a.gid,
    a."Huisletter" AS huisletter,
    a."Straatnaam" AS "openbareRuimteNaam",
    a."Adres_ID" AS "bagId",
        CASE
            WHEN ltrim(a."Adresseerbaarobject_ID"::text, '0'::text) = ''::text THEN NULL::bigint
            ELSE ltrim(a."Adresseerbaarobject_ID"::text, '0'::text)::bigint
        END AS "adresseerbaarObject",
        CASE
            WHEN ltrim(a."Adresseerbaarobject_ID"::text, '0'::text) = ''::text THEN NULL::bigint
            ELSE ltrim(a."Adresseerbaarobject_ID"::text, '0'::text)::bigint
        END AS "bagId2",
    a."TypeAdresseerbaarobject" as "typeAdresseerbaarObject",    
    a."Huisnummer" AS huisnummer,
    a."Plaats" AS "woonplaatsNaam",
    a."Gemeente" AS "gemeenteNaam",
    a."Toevoeging" AS huisnummertoevoeging,
    a."Postcode" AS postcode
   FROM wfs."Adres" a
);
grant select on table dbk2."Adres" to public;


CREATE OR REPLACE VIEW dbk2."AantalPersonen" AS 
 SELECT a.gid,
    a."DBK_ID" AS dbkfeature_id,
    a."TypeGroep" AS "typeAanwezigheidsgroep",
    a."Aantal" AS aantal,
    a."AantalNZR" AS "aantalNietZelfredzaam",
    a.maandag,
    a.dinsdag,
    a.woensdag,
    a.donderdag,
    a.vrijdag,
    a.zaterdag,
    a.zondag,
    to_timestamp(a."Begintijd"::text, 'HH24MISSMS'::text)::time without time zone AS "tijdvakBegintijd",
    to_timestamp(a."Eindtijd"::text, 'HH24MISSMS'::text)::time without time zone AS "tijdvakEindtijd"
   FROM wfs."AantalPersonen" a;
GRANT SELECT ON TABLE dbk2."AantalPersonen" TO public;

CREATE OR REPLACE VIEW dbk2."Bijzonderheid" AS 
 SELECT a.gid,
    a.dbkfeature_id,
    a.tekst,
    a.soort,
    a.seq
   FROM ( SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Bijzonderheden" AS tekst,
            'Algemeen'::character varying AS soort,
            1 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Bijzonderheden"::text <> ''::text AND NOT "DBK"."Bijzonderheden" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Bijzonderheden2" AS tekst,
            'Algemeen'::character varying AS soort,
            2 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Bijzonderheden2"::text <> ''::text AND NOT "DBK"."Bijzonderheden2" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Prev_Bijz_1" AS tekst,
            'Preventie'::character varying AS soort,
            1 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Prev_Bijz_1"::text <> ''::text AND NOT "DBK"."Prev_Bijz_1" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Prev_Bijz_2" AS tekst,
            'Preventie'::character varying AS soort,
            2 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Prev_Bijz_2"::text <> ''::text AND NOT "DBK"."Prev_Bijz_2" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Prep_Bijz_1" AS tekst,
            'Preparatie'::character varying AS soort,
            1 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Prep_Bijz_1"::text <> ''::text AND NOT "DBK"."Prep_Bijz_1" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Prep_Bijz_2" AS tekst,
            'Preparatie'::character varying AS soort,
            2 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Prep_Bijz_2"::text <> ''::text AND NOT "DBK"."Prep_Bijz_2" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Repr_Bijz_1" AS tekst,
            'Repressie'::character varying AS soort,
            1 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Repr_Bijz_1"::text <> ''::text AND NOT "DBK"."Repr_Bijz_1" IS NULL
        UNION
         SELECT "DBK".gid,
            "DBK"."DBK_ID" AS dbkfeature_id,
            "DBK"."Repr_Bijz_2" AS tekst,
            'Repressie'::character varying AS soort,
            2 AS seq
           FROM wfs."DBK"
          WHERE "DBK"."Repr_Bijz_2"::text <> ''::text AND NOT "DBK"."Repr_Bijz_2" IS NULL) a
  ORDER BY a.dbkfeature_id, a.soort, a.seq;
GRANT SELECT ON TABLE dbk2."Bijzonderheid" TO public;

CREATE OR REPLACE VIEW dbk2."Brandcompartiment" AS 
 SELECT "Brandcompartiment".gid,
    "Brandcompartiment"."DBK_ID" AS dbkfeature_id,
    "Brandcompartiment".the_geom AS geometrie,
        CASE
            WHEN lower("Brandcompartiment"."Soort"::text) = '30 minuten'::text THEN '30 minuten brandwerende scheiding'
            WHEN lower("Brandcompartiment"."Soort"::text) = '60 minuten'::text THEN '60 minuten brandwerende scheiding'
            WHEN lower("Brandcompartiment"."Soort"::text) = 'rookwerend'::text THEN 'Rookwerende scheiding'
            WHEN lower("Brandcompartiment"."Soort"::text) = '>60 minuten'::text THEN '> 60 minuten brandwerende scheiding'
            ELSE 'Scheiding (algemeen)'
        END AS "typeScheiding",
        CASE
            WHEN "Brandcompartiment"."Omschrijving"::text = ''::text THEN NULL::character varying
            ELSE "Brandcompartiment"."Omschrijving"
        END AS "aanvullendeInformatie",
        CASE
            WHEN "Brandcompartiment"."Label"::text = ''::text THEN NULL::character varying
            ELSE "Brandcompartiment"."Label"
        END AS "Label"
   FROM wfs."Brandcompartiment";
GRANT SELECT ON TABLE dbk2."Brandcompartiment" TO public;

CREATE OR REPLACE VIEW dbk2."Contact" AS 
 SELECT "Contact".gid,
    "Contact"."DBK_ID" AS dbkfeature_id,
        CASE
            WHEN "Contact"."Functie"::text = ''::text THEN 'Contact'::character varying
            ELSE "Contact"."Functie"
        END AS functie,
    "Contact"."Naam" AS naam,
    "Contact"."Telefoonnummer" AS telefoonnummer
   FROM wfs."Contact";
GRANT SELECT ON TABLE dbk2."Contact" TO public;

CREATE OR REPLACE VIEW dbk2."Foto" AS 
 SELECT bv.gid,
    bv."DBK_ID" AS dbkfeature_id,
        CASE
            WHEN bv."Omschrijving"::text = ''::text THEN bv."Picturename"
            ELSE bv."Omschrijving"
        END AS naam,
    bv."Picturename" AS "URL",
    substr(bv."Picturename"::text, length(bv."Picturename"::text) - 4, 1) AS pos,
        CASE
            WHEN lower("right"(bv."Picturename"::text, "position"(reverse(bv."Picturename"::text), '.'::text) - 1)) = ANY (ARRAY['jpg'::text, 'gif'::text, 'png'::text, 'jpeg'::text]) THEN 'afbeelding'::text
            ELSE
            CASE
                WHEN lower("right"(bv."Picturename"::text, "position"(reverse(bv."Picturename"::text), '.'::text) - 1)) = ANY (ARRAY['doc'::text, 'xls'::text, 'pdf'::text, 'docx'::text]) THEN 'document'::text
                ELSE 'weblink'::text
            END
        END AS filetype,
    1 AS bron
   FROM wfs."Brandweervoorziening" bv
  WHERE NOT bv."Picturename"::text = ''::text
UNION
 SELECT f.gid,
    f."DBK_ID" AS dbkfeature_id,
    f."Documentnaam" AS naam,
        CASE
            WHEN "position"(f."Documentnaam"::text, f."DBK_ID"::character varying::text) = 1 THEN f."Documentnaam"::text
            ELSE
            CASE
                WHEN lower(f."Bestandstype"::text) = 'weblink'::text THEN f."Documentnaam"::text
                ELSE (f."DBK_ID"::character varying::text || '-'::text) || f."Documentnaam"::text
            END
        END AS "URL",
    ''::text AS pos,
    lower(f."Bestandstype"::text) AS filetype,
    2 AS bron
   FROM wfs."Foto" f
  WHERE NOT f."Documentnaam"::text = ''::text;
GRANT SELECT ON TABLE dbk2."Foto" TO public;

CREATE OR REPLACE VIEW dbk2."GevaarlijkeStof" AS 
 SELECT p.gid,
    p."DBK_ID" AS dbkfeature_id,
    p.the_geom AS locatie,
    p."NaamStof"::character varying(50) AS "naamStof",
    p."GEVIcode" AS gevaarsindicatienummer,
    p."UNnr" AS "UNnummer",
    p."Hoeveelheid" AS hoeveelheid,
    p."Symbol" AS "symboolCode",
    ( SELECT replace(lower(tgs.namespace::text), '-'::text, ''::text) AS replace
           FROM dbk.type_gevaarlijkestof tgs -- XXX dbk. schema, verplaats naar code gebruik NEN type kolom bij M&B net als Brandweervoorziening
          WHERE tgs.gevaarlijkestof_symbool::text = p."Symbol"::text) AS namespace,
    p."Omschrijving"::text AS "aanvullendeInformatie"
   FROM wfs."GevaarlijkeStof" p;
GRANT SELECT ON TABLE dbk2."GevaarlijkeStof" TO public;

CREATE OR REPLACE VIEW dbk2."Hulplijn" AS 
 SELECT "Hulplijn".gid,
    "Hulplijn"."DBK_ID" AS dbkfeature_id,
    "Hulplijn"."Type" AS "typeHulplijn",
        CASE
            WHEN "Hulplijn"."Omschrijving"::text = ''::text THEN NULL::character varying
            ELSE "Hulplijn"."Omschrijving"
        END AS "aanvullendeInformatie",
    "Hulplijn".the_geom AS geometrie
   FROM wfs."Hulplijn";
GRANT SELECT ON TABLE dbk2."Hulplijn" TO public;

CREATE OR REPLACE VIEW dbk2."TekstObject" AS 
 SELECT "TekstObject".gid,
    "TekstObject"."DBK_ID" AS dbkfeature_id,
    "TekstObject"."Tekst" AS tekst,
    "TekstObject".the_geom AS absolutepositie,
    "TekstObject"."Rotatie" AS hoek,
    "TekstObject"."LabelSize" AS schaal
   FROM wfs."TekstObject";
GRANT SELECT ON TABLE dbk2."TekstObject" TO public;


CREATE OR REPLACE VIEW dbk2."ToegangTerrein" AS 
 SELECT "ToegangTerrein".gid,
    "ToegangTerrein"."DBK_ID" AS dbkfeature_id,
    "ToegangTerrein".the_geom AS geometrie,
        CASE
            WHEN "ToegangTerrein"."Primair" = 1 THEN true
            ELSE false
        END AS primair,
        CASE
            WHEN "ToegangTerrein"."NaamRoute"::text = ''::text THEN tt.naam
            ELSE "ToegangTerrein"."NaamRoute"
        END AS "naamRoute",
    "ToegangTerrein"."Omschrijving"::text AS "aanvullendeInformatie"
   FROM wfs."ToegangTerrein"
     JOIN dbk.type_toegangterrein tt ON "ToegangTerrein"."Primair" = tt.gid; -- XXX dbk. schema, verwijder type_ tabel
GRANT SELECT ON TABLE dbk2."ToegangTerrein" TO public;

CREATE OR REPLACE FUNCTION dbk2.dbkfeatures_json(IN srid integer DEFAULT 28992)
  RETURNS TABLE(identificatie integer, feature json) AS
$BODY$
SELECT t.identificatie,
    row_to_json(t.*) AS "feature"
   FROM ( SELECT 
	gid, identificatie, "BHVaanwezig", "controleDatum", "formeleNaam", 
        "informeleNaam", "OMSNummer", inzetprocedure, "typeFeature", 
        st_asgeojson(st_transform(geometrie,$1),15,2)::json as geometry, verwerkt, hoofdobject, bouwlaag, risicoklasse,
        (select st_asgeojson(st_transform(g.the_geom,$1),15,2)::json from wfs."Gebied" g where g."DBK_ID" = d.identificatie) as selectiekader,
        (select count(*) from wfs."DBK2" d2 where d2."Hoofdobject_ID" = d.identificatie) as verdiepingen,
            ( SELECT array_to_json(array_agg(row_to_json(a.*))) AS array_to_json
                   FROM ( SELECT "Adres"."bagId",
                            "Adres"."openbareRuimteNaam",
                            "Adres".huisnummer,
                            "Adres".huisletter,
                            "Adres"."woonplaatsNaam",
                            "Adres"."gemeenteNaam",
                            "Adres"."adresseerbaarObject",
                            "Adres"."typeAdresseerbaarObject",
                            "Adres".huisnummertoevoeging,
                            "Adres".postcode
                           FROM dbk2."Adres"
                          WHERE "Adres"."bagId" = (select dob.adres_id from dbk2."DBKObject" dob where dob.dbkfeature_id = d.identificatie)) a) AS adres,
        (select json from dbk2."Adressen" a where a.identificatie = d.identificatie) as adressen                          
   FROM dbk2."DBKFeature" d where d.hoofdobject is null AND (not d.geometrie is null and not st_isempty(d.geometrie) and not d."typeFeature" is null) AND (viewer = true) AND ((now() > datumtijdviewerbegin and now() <= datumtijdviewereind) OR 
(datumtijdviewerbegin is null and datumtijdviewereind is null) OR
(now() > datumtijdviewerbegin and datumtijdviewereind is null) OR
(datumtijdviewerbegin is null and now() <= datumtijdviewereind))
) t;
$BODY$
  LANGUAGE sql VOLATILE
  COST 100
  ROWS 1000;


CREATE OR REPLACE FUNCTION dbk2.dbkobject_json(IN id integer, IN srid integer DEFAULT 28992)
  RETURNS TABLE(identificatie integer, "DBKObject" json) AS
$BODY$
SELECT t.identificatie,
    row_to_json(t.*) AS "DBKObject"
   FROM ( SELECT d.identificatie,
            d."BHVaanwezig",
            d."controleDatum",
            d."formeleNaam",
            d."informeleNaam",
            dob."OMSnummer",
            d.inzetprocedure,
            dob."laagsteBouwlaag",
            dob."hoogsteBouwlaag",
	        d.bouwlaag,
            d.risicoklasse,
            dob.gebouwconstructie,
            dob.gebruikstype,
            d.verwerkt,
            ( SELECT array_to_json(array_agg(row_to_json(a.*))) AS array_to_json
                   FROM ( SELECT "AantalPersonen"."typeAanwezigheidsgroep",
                            "AantalPersonen".aantal,
                            "AantalPersonen"."aantalNietZelfredzaam",
                            "AantalPersonen"."tijdvakBegintijd",
                            "AantalPersonen"."tijdvakEindtijd",
                            "AantalPersonen".maandag,
                            "AantalPersonen".dinsdag,
                            "AantalPersonen".woensdag,
                            "AantalPersonen".donderdag,
                            "AantalPersonen".vrijdag,
                            "AantalPersonen".zaterdag,
                            "AantalPersonen".zondag
                           FROM dbk2."AantalPersonen"
                          WHERE "AantalPersonen".dbkfeature_id = d.identificatie) a) AS verblijf,
            ( SELECT array_to_json(array_agg(row_to_json(a.*))) AS array_to_json
                   FROM ( SELECT "Adres"."bagId",
                            "Adres"."openbareRuimteNaam",
                            "Adres".huisnummer,
                            "Adres".huisletter,
                            "Adres"."woonplaatsNaam",
                            "Adres"."gemeenteNaam",
                            "Adres"."adresseerbaarObject",
                            "Adres"."typeAdresseerbaarObject",
                            "Adres".huisnummertoevoeging,
                            "Adres".postcode
                           FROM dbk2."Adres"
                          WHERE "Adres"."bagId" = dob.adres_id) a) AS adres,
/* wfs */   ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "AlternatiefComm"::character varying as "alternatieveCommInfrastructuur",
                            "Dekking"::boolean as dekking,
                            "Aanvullendeinformatie"::text as "aanvullendeInformatie",
                            st_asgeojson(st_transform(the_geom,$2), 15, 2)::json AS geometry
                           FROM wfs."AfwijkendeBinnendekking"
                          WHERE "AfwijkendeBinnendekking"."DBK_ID" = d.identificatie) b) AS afwijkendebinnendekking,
            ( SELECT array_to_json(array_agg(row_to_json(a.*))) AS array_to_json
                   FROM ( SELECT "Bijzonderheid".seq,
                            "Bijzonderheid".soort,
                            "Bijzonderheid".tekst
                           FROM dbk2."Bijzonderheid"
                          WHERE "Bijzonderheid".dbkfeature_id = d.identificatie
                          ORDER BY "Bijzonderheid".soort, "Bijzonderheid".seq) a) AS bijzonderheid,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "Brandcompartiment"."typeScheiding","Label", "aanvullendeInformatie", 
                            st_asgeojson(st_transform("Brandcompartiment".geometrie,$2), 15, 2)::json AS geometry
                           FROM dbk2."Brandcompartiment"
                          WHERE "Brandcompartiment".dbkfeature_id = d.identificatie) b) AS brandcompartiment,
/*            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "Brandweervoorziening"."typeVoorziening",
                            "Brandweervoorziening"."naamVoorziening",
			    lower("namespace") as namespace,
                            "Brandweervoorziening"."aanvullendeInformatie",
                            "Brandweervoorziening".hoek,
                            categorie,
                            radius,
                            st_asgeojson(st_transform("Brandweervoorziening".locatie,$2), 15, 2)::json AS geometry
                           FROM dbk2."Brandweervoorziening"
                          WHERE "Brandweervoorziening".dbkfeature_id = d.identificatie) b) AS brandweervoorziening,*/
	      ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT identificatie,
                            bouwlaag,
                            case when hoofdobject is null then 'hoofdobject' else 'verdieping' end as "type",
                            "informeleNaam",
                             "formeleNaam"                            
                           FROM dbk2."DBKFeature"
                          WHERE (dbk2."DBKFeature".hoofdobject = d.identificatie OR dbk2."DBKFeature".identificatie = d.identificatie OR dbk2."DBKFeature".hoofdobject = d.hoofdobject OR 
                          dbk2."DBKFeature".identificatie = d.hoofdobject) AND
                          (viewer = true) AND ((now() > datumtijdviewerbegin and now() <= datumtijdviewereind) OR 
(datumtijdviewerbegin is null and datumtijdviewereind is null) OR
(now() > datumtijdviewerbegin and datumtijdviewereind is null) OR
(datumtijdviewerbegin is null and now() <= datumtijdviewereind))
                          ORDER BY bouwlaag) b) AS verdiepingen,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "Contact".functie,
                            "Contact".naam,
                            "Contact".telefoonnummer
                           FROM dbk2."Contact"
                          WHERE "Contact".dbkfeature_id = d.identificatie
                          ORDER BY "Contact".naam) b) AS contact,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "Foto".naam,
                            "Foto"."URL",
                            "Foto".filetype
                           FROM dbk2."Foto"
                          WHERE "Foto".dbkfeature_id = d.identificatie
                          ORDER BY "Foto".bron, "Foto".pos, "Foto"."URL") b) AS foto,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "GevaarlijkeStof"."naamStof",
                            "GevaarlijkeStof".gevaarsindicatienummer,
                            "GevaarlijkeStof"."UNnummer",
                            "GevaarlijkeStof".hoeveelheid,
                            "GevaarlijkeStof"."symboolCode",
                            lower("namespace") as namespace,
                            "GevaarlijkeStof"."aanvullendeInformatie",
                            st_asgeojson(st_transform("GevaarlijkeStof".locatie,$2), 15, 2)::json AS geometry
                           FROM dbk2."GevaarlijkeStof"
                          WHERE "GevaarlijkeStof".dbkfeature_id = d.identificatie) b) AS gevaarlijkestof,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "Hulplijn"."typeHulplijn", "aanvullendeInformatie",
                            st_asgeojson(st_transform("Hulplijn".geometrie, $2), 15, 2)::json AS geometry
                           FROM dbk2."Hulplijn"
                          WHERE "Hulplijn".dbkfeature_id = d.identificatie) b) AS hulplijn,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "Pandgeometrie"."bagId",
                            "Pandgeometrie"."bagStatus",
                            st_asgeojson(st_transform("Pandgeometrie".geometrie,$2), 15, 2)::json AS geometry
                           FROM dbk2."Pandgeometrie"
                          WHERE "Pandgeometrie".dbkfeature_id = d.identificatie) b) AS pandgeometrie,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "TekstObject".tekst,
                            "TekstObject".hoek,
                            "TekstObject".schaal,
                            st_asgeojson(st_transform("TekstObject".absolutepositie, $2), 15, 2)::json AS geometry
                           FROM dbk2."TekstObject"
                          WHERE "TekstObject".dbkfeature_id = d.identificatie) b) AS tekstobject,
            ( SELECT array_to_json(array_agg(row_to_json(b.*))) AS array_to_json
                   FROM ( SELECT "ToegangTerrein".primair,
                            "ToegangTerrein"."naamRoute",
                            "ToegangTerrein"."aanvullendeInformatie",
                            st_asgeojson(st_transform("ToegangTerrein".geometrie,$2), 15, 2)::json AS geometry
                           FROM dbk2."ToegangTerrein"
                          WHERE "ToegangTerrein".dbkfeature_id = d.identificatie) b) AS toegangterrein,
/* wfs */   (select array_to_json(array_agg(row_to_json(b.*))) as array_to_json
            from    (select "Code","X","Y","Rotatie","Omschrijving","Picturename"
            from wfs."Brandweervoorziening" where "DBK_ID" = d.identificatie
            ) b) as brandweervoorziening2,

/* wfs */   (select array_to_json(array_agg(row_to_json(b.*))) as array_to_json
            from    (select "Soort","Omschrijving",st_asgeojson(st_transform(the_geom, 28992))::json AS geometry
            from wfs."Custom_Polygon" where "DBK_ID" = d.identificatie
            order by case "Soort"
                when '>15 meter' then -3
                when '10-15 meter' then -2
                when '5-10 meter' then -1
                when '0-5 meter' then 0
                else gid end asc
            ) b) as custom_polygon,
            
/* wfs */   (select array_to_json(array_agg(row_to_json(b.*))) as array_to_json
            from    (select "Soort","Tekst","Tabblad","Seq"
            from wfs."Bijzonderheid" where "DBK_ID" = d.identificatie
            order by "Seq" asc
            ) b) as custom_bijzonderheid,

/* wfs */   (select st_asgeojson(st_collect(st_transform("Gebied".the_geom, 28992)))::json 
            from wfs."Gebied" where "DBK_ID" = $1 group by "DBK_ID") as gebied

           FROM dbk2."DBKFeature" d 
           join dbk2."DBKObject" dob on d.identificatie = dob.dbkfeature_id
           WHERE d.identificatie = $1) t;
$BODY$
  LANGUAGE sql VOLATILE
  COST 100
  ROWS 1000;

