package com.shelf.repository;

import com.shelf.model.Friendship;
import com.shelf.model.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("""
            select f from Friendship f
            where (f.requester.id = :userA and f.addressee.id = :userB)
               or (f.requester.id = :userB and f.addressee.id = :userA)
            """)
    Optional<Friendship> findBetweenUsers(@Param("userA") Long userA, @Param("userB") Long userB);

    @Query("""
            select f from Friendship f
            where f.status = com.shelf.model.FriendshipStatus.ACCEPTED
              and (f.requester.id = :userId or f.addressee.id = :userId)
            order by f.updatedAt desc
            """)
    List<Friendship> findAcceptedByUserId(@Param("userId") Long userId);

    @Query("""
            select f from Friendship f
            where f.status = com.shelf.model.FriendshipStatus.PENDING
              and f.addressee.id = :userId
            order by f.createdAt desc
            """)
    List<Friendship> findIncomingPendingByUserId(@Param("userId") Long userId);

    @Query("""
            select f from Friendship f
            where f.status = com.shelf.model.FriendshipStatus.PENDING
              and f.requester.id = :userId
            order by f.createdAt desc
            """)
    List<Friendship> findOutgoingPendingByUserId(@Param("userId") Long userId);

    long countByStatusAndRequester_IdOrStatusAndAddressee_Id(
            FriendshipStatus status1,
            Long requesterId,
            FriendshipStatus status2,
            Long addresseeId);
}
