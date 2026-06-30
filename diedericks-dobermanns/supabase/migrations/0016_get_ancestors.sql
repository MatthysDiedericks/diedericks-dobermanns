-- Pedigree ancestor traversal for Wright's COI (uses father_id / mother_id on dogs)
-- NOTE: Recursive CTE uses CROSS JOIN VALUES pattern — two non-recursive anchor
-- terms in a single UNION ALL are not valid Postgres syntax, so sire+dam expansion
-- is done inside the recursive step via CROSS JOIN (VALUES (1),(2)) AS s(step).

CREATE OR REPLACE FUNCTION get_ancestors(p_dog_id uuid, p_depth int DEFAULT 4)
RETURNS TABLE(ancestor_id uuid, depth int, path text) AS $$
WITH RECURSIVE ancestry AS (
  -- Anchor: seed row is the dog itself (depth 0), carries father_id/mother_id
  SELECT id AS ancestor_id, 0 AS depth, ''::text AS path,
         father_id, mother_id
  FROM dogs WHERE id = p_dog_id
  UNION ALL
  -- Recursive: expand sire (step=1) and dam (step=2) in one pass
  SELECT
    CASE WHEN step = 1 THEN a.father_id ELSE a.mother_id END,
    a.depth + 1,
    CASE WHEN step = 1 THEN
      CASE WHEN a.path = '' THEN 'sire' ELSE a.path || '>sire' END
    ELSE
      CASE WHEN a.path = '' THEN 'dam' ELSE a.path || '>dam' END
    END,
    d.father_id,
    d.mother_id
  FROM ancestry a
  CROSS JOIN (VALUES (1),(2)) AS s(step)
  JOIN dogs d ON d.id = CASE WHEN step = 1 THEN a.father_id ELSE a.mother_id END
  WHERE a.depth < p_depth
    AND CASE WHEN step = 1 THEN a.father_id ELSE a.mother_id END IS NOT NULL
)
SELECT DISTINCT ancestor_id, depth, path
FROM ancestry
WHERE depth > 0 AND ancestor_id IS NOT NULL;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_ancestors(uuid, int) TO authenticated;
