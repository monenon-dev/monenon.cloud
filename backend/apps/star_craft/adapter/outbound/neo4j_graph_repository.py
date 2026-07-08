"""star_craft — Neo4j GraphRepositoryPort 구현체."""

from __future__ import annotations

import logging

from lol.neo4j import get_driver
from star_craft.app.ports.output import GraphRepositoryPort
from star_craft.domain import SpokeNode

logger = logging.getLogger(__name__)


class Neo4jGraphRepository(GraphRepositoryPort):

    async def seed_hub(self) -> None:
        driver = get_driver()
        async with driver.session() as s:
            await s.run("MERGE (h:Hub {name: 'star_craft'}) SET h.status = 'active'")
        logger.info("[star_craft/neo4j] Hub 노드 초기화 완료")

    async def register_spoke(self, spoke: SpokeNode) -> None:
        driver = get_driver()
        async with driver.session() as s:
            await s.run(
                """
                MERGE (node:Spoke {name: $name})
                SET node.description = $description,
                    node.endpoint    = $endpoint,
                    node.status      = $status
                WITH node
                MATCH (h:Hub {name: 'star_craft'})
                MERGE (h)-[:ORCHESTRATES]->(node)
                MERGE (node)-[:CONNECTS_TO]->(h)
                """,
                name=spoke.name, description=spoke.description,
                endpoint=spoke.endpoint, status=spoke.status,
            )
        logger.info("[star_craft/neo4j] 스포크 등록: %s", spoke.name)

    async def get_active_spokes(self) -> list[SpokeNode]:
        driver = get_driver()
        async with driver.session() as s:
            result = await s.run(
                """
                MATCH (h:Hub {name: 'star_craft'})-[:ORCHESTRATES]->(node:Spoke {status: 'active'})
                RETURN node.name AS name, node.description AS description,
                       node.endpoint AS endpoint, node.status AS status
                """
            )
            records = await result.data()
        return [SpokeNode(**r) for r in records]

    async def get_spoke_path(self, candidates: list[str]) -> list[SpokeNode]:
        if not candidates:
            return []
        driver = get_driver()
        async with driver.session() as s:
            result = await s.run(
                """
                MATCH (h:Hub {name: 'star_craft'})-[:ORCHESTRATES]->(node:Spoke)
                WHERE node.name IN $candidates AND node.status = 'active'
                RETURN node.name AS name, node.description AS description,
                       node.endpoint AS endpoint, node.status AS status
                """,
                candidates=candidates,
            )
            records = await result.data()
        return [SpokeNode(**r) for r in records]

    async def deactivate_spoke(self, name: str) -> None:
        driver = get_driver()
        async with driver.session() as s:
            await s.run("MATCH (node:Spoke {name: $name}) SET node.status = 'inactive'", name=name)
